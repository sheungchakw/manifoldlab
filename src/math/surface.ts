import { Vector3 } from 'three'
import type { SurfaceFn, Range } from './types'
import { rangeSpan, wrapToRange } from './types'
import { partialU, partialV, partialUU, partialUV, partialVV, dScalar } from './differentiate'
import { rk4Step } from './ode'

export interface FirstForm {
  E: number
  F: number
  G: number
}

export interface SecondForm {
  L: number
  M: number
  N: number
}

export type PointClass = 'elliptic' | 'hyperbolic' | 'parabolic' | 'planar'

export interface SurfacePointInfo {
  point: Vector3
  ru: Vector3
  rv: Vector3
  normal: Vector3
  first: FirstForm
  second: SecondForm
  K: number
  H: number
  k1: number
  k2: number
  /** Principal directions as 3D unit tangent vectors (undefined at umbilics). */
  dir1: Vector3
  dir2: Vector3
  umbilic: boolean
  classification: PointClass
}

const REGULAR_EPS = 1e-9
const CLASSIFY_TOL = 1e-6

/**
 * A parametric surface r(u, v) in R^3 with intrinsic/extrinsic geometry.
 * Derivatives are numeric, so any smooth parametrization works, at the cost
 * of accuracy very close to chart singularities (e.g. sphere poles).
 */
export class ParametricSurface {
  readonly fn: SurfaceFn
  readonly uRange: Range
  readonly vRange: Range
  readonly uPeriodic: boolean
  readonly vPeriodic: boolean

  constructor(
    fn: SurfaceFn,
    uRange: Range,
    vRange: Range,
    opts: { uPeriodic?: boolean; vPeriodic?: boolean } = {},
  ) {
    this.fn = fn
    this.uRange = uRange
    this.vRange = vRange
    this.uPeriodic = opts.uPeriodic ?? false
    this.vPeriodic = opts.vPeriodic ?? false
  }

  point(u: number, v: number): Vector3 {
    return this.fn(u, v)
  }

  ru(u: number, v: number): Vector3 {
    return partialU(this.fn, u, v)
  }

  rv(u: number, v: number): Vector3 {
    return partialV(this.fn, u, v)
  }

  /** Unit normal n = (ru × rv)/|ru × rv|. Zero vector at degenerate points. */
  normal(u: number, v: number): Vector3 {
    const n = this.ru(u, v).cross(this.rv(u, v))
    const len = n.length()
    return len < REGULAR_EPS ? n : n.divideScalar(len)
  }

  isRegular(u: number, v: number): boolean {
    return this.ru(u, v).cross(this.rv(u, v)).length() > 1e-7
  }

  /** First fundamental form: E = <ru,ru>, F = <ru,rv>, G = <rv,rv>. */
  firstForm(u: number, v: number): FirstForm {
    const ru = this.ru(u, v)
    const rv = this.rv(u, v)
    return { E: ru.dot(ru), F: ru.dot(rv), G: rv.dot(rv) }
  }

  /** Area element sqrt(EG - F^2). */
  areaElement(u: number, v: number): number {
    const { E, F, G } = this.firstForm(u, v)
    return Math.sqrt(Math.max(E * G - F * F, 0))
  }

  /** Second fundamental form: L = <ruu,n>, M = <ruv,n>, N = <rvv,n>. */
  secondForm(u: number, v: number): SecondForm {
    const n = this.normal(u, v)
    return {
      L: partialUU(this.fn, u, v).dot(n),
      M: partialUV(this.fn, u, v).dot(n),
      N: partialVV(this.fn, u, v).dot(n),
    }
  }

  /**
   * Shape operator (Weingarten map) S = I^{-1} II in the basis {ru, rv},
   * as a row-major 2x2 matrix [[a, b], [c, d]].
   */
  shapeOperator(u: number, v: number): [[number, number], [number, number]] {
    const { E, F, G } = this.firstForm(u, v)
    const { L, M, N } = this.secondForm(u, v)
    const det = E * G - F * F
    if (Math.abs(det) < REGULAR_EPS) return [[0, 0], [0, 0]]
    return [
      [(G * L - F * M) / det, (G * M - F * N) / det],
      [(-F * L + E * M) / det, (-F * M + E * N) / det],
    ]
  }

  /** Gaussian curvature K = det(II) / det(I). Orientation independent. */
  gaussianCurvature(u: number, v: number): number {
    const { E, F, G } = this.firstForm(u, v)
    const { L, M, N } = this.secondForm(u, v)
    const det = E * G - F * F
    if (Math.abs(det) < REGULAR_EPS) return 0
    return (L * N - M * M) / det
  }

  /** Mean curvature H = (EN - 2FM + GL) / (2 det I). Sign depends on normal. */
  meanCurvature(u: number, v: number): number {
    const { E, F, G } = this.firstForm(u, v)
    const { L, M, N } = this.secondForm(u, v)
    const det = E * G - F * F
    if (Math.abs(det) < REGULAR_EPS) return 0
    return (E * N - 2 * F * M + G * L) / (2 * det)
  }

  /** Principal curvatures k1 >= k2 (eigenvalues of the shape operator). */
  principalCurvatures(u: number, v: number): { k1: number; k2: number } {
    const K = this.gaussianCurvature(u, v)
    const H = this.meanCurvature(u, v)
    const disc = Math.max(H * H - K, 0)
    const root = Math.sqrt(disc)
    return { k1: H + root, k2: H - root }
  }

  /**
   * Principal directions in parameter space: eigenvectors of the shape
   * operator, normalized w.r.t. the metric (unit speed). Used to integrate
   * lines of curvature. Falls back to coordinate directions at umbilics.
   */
  principalDirectionsUV(
    u: number,
    v: number,
  ): { d1: { du: number; dv: number }; d2: { du: number; dv: number }; umbilic: boolean } {
    const S = this.shapeOperator(u, v)
    const { k1, k2 } = this.principalCurvatures(u, v)
    const umbilic = Math.abs(k1 - k2) < 1e-6 * Math.max(1, Math.abs(k1), Math.abs(k2))

    const normalize = (a: number, b: number): { du: number; dv: number } => {
      const s = this.metricSpeed(u, v, a, b)
      return s < 1e-9 ? { du: 1, dv: 0 } : { du: a / s, dv: b / s }
    }

    if (umbilic) {
      return { d1: normalize(1, 0), d2: normalize(0, 1), umbilic: true }
    }
    const eigen = (k: number): { du: number; dv: number } => {
      const [[a, b], [c, d]] = S
      if (Math.abs(b) > 1e-9) return normalize(b, k - a)
      if (Math.abs(c) > 1e-9) return normalize(k - d, c)
      return normalize(1, 0)
    }
    return { d1: eigen(k1), d2: eigen(k2), umbilic: false }
  }

  /**
   * Principal directions as 3D unit tangent vectors.
   * At umbilics (k1 = k2) returns the coordinate directions instead.
   */
  principalDirections(u: number, v: number): { dir1: Vector3; dir2: Vector3 } {
    const ru = this.ru(u, v)
    const rv = this.rv(u, v)
    const S = this.shapeOperator(u, v)
    const { k1, k2 } = this.principalCurvatures(u, v)

    const to3D = (a: number, b: number): Vector3 =>
      ru.clone().multiplyScalar(a).addScaledVector(rv, b).normalize()

    const eigen = (k: number): Vector3 => {
      const [[a, b], [c, d]] = S
      if (Math.abs(b) > 1e-9) return to3D(b, k - a)
      if (Math.abs(c) > 1e-9) return to3D(k - d, c)
      // Diagonal S: coordinate curves are principal (e.g. surfaces of revolution)
      return to3D(1, 0)
    }

    const umbilic = Math.abs(k1 - k2) < 1e-6 * Math.max(1, Math.abs(k1), Math.abs(k2))
    if (umbilic) {
      return { dir1: to3D(1, 0), dir2: to3D(0, 1) }
    }
    return { dir1: eigen(k1), dir2: eigen(k2) }
  }

  classify(u: number, v: number): PointClass {
    const { L, M, N } = this.secondForm(u, v)
    const K = this.gaussianCurvature(u, v)
    const scale = Math.max(Math.abs(L), Math.abs(M), Math.abs(N))
    if (scale < CLASSIFY_TOL * 0.01) return 'planar'
    if (K > CLASSIFY_TOL) return 'elliptic'
    if (K < -CLASSIFY_TOL) return 'hyperbolic'
    return 'parabolic'
  }

  /** Full differential-geometric snapshot at (u, v). */
  info(u: number, v: number): SurfacePointInfo {
    const point = this.point(u, v)
    const ru = this.ru(u, v)
    const rv = this.rv(u, v)
    const normal = this.normal(u, v)
    const first = this.firstForm(u, v)
    const second = this.secondForm(u, v)
    const K = this.gaussianCurvature(u, v)
    const H = this.meanCurvature(u, v)
    const { k1, k2 } = this.principalCurvatures(u, v)
    const { dir1, dir2 } = this.principalDirections(u, v)
    const umbilic =
      Math.abs(k1 - k2) < 1e-6 * Math.max(1, Math.abs(k1), Math.abs(k2))
    return {
      point,
      ru,
      rv,
      normal,
      first,
      second,
      K,
      H,
      k1,
      k2,
      dir1,
      dir2,
      umbilic,
      classification: this.classify(u, v),
    }
  }

  /**
   * Christoffel symbols of the second kind Γ[k][i][j] with
   * indices 0 = u, 1 = v, computed numerically from the metric:
   * Γ^k_ij = 1/2 g^{kl} (∂_j g_{lk} + ∂_i g_{lj} − ∂_l g_{ij}).
   */
  christoffel(u: number, v: number): number[][][] {
    const metric = (uu: number, vv: number): number[][] => {
      const { E, F, G } = this.firstForm(uu, vv)
      return [
        [E, F],
        [F, G],
      ]
    }
    const g = metric(u, v)
    const det = g[0][0] * g[1][1] - g[0][1] * g[1][0]
    if (Math.abs(det) < REGULAR_EPS)
      return [
        [
          [0, 0],
          [0, 0],
        ],
        [
          [0, 0],
          [0, 0],
        ],
      ]
    const gi = [
      [g[1][1] / det, -g[0][1] / det],
      [-g[1][0] / det, g[0][0] / det],
    ]
    // dg[i][j][l] = ∂g_ij / ∂ξ^l
    const comp = (uu: number, vv: number, i: number, j: number) => metric(uu, vv)[i][j]
    const dg: number[][][] = [0, 1].map((i) =>
      [0, 1].map((j) => [
        dScalar((uu, vv) => comp(uu, vv, i, j), u, v, 0),
        dScalar((uu, vv) => comp(uu, vv, i, j), u, v, 1),
      ]),
    )
    const Gamma: number[][][] = [0, 1].map((k) =>
      [0, 1].map((i) =>
        [0, 1].map((j) => {
          let sum = 0
          for (let l = 0; l < 2; l++) {
            // Γ^k_ij = ½ g^{kl} (∂_j g_{li} + ∂_i g_{lj} − ∂_l g_{ij})
            sum += gi[k][l] * (dg[l][i][j] + dg[l][j][i] - dg[i][j][l])
          }
          return 0.5 * sum
        }),
      ),
    )
    return Gamma
  }

  /**
   * Geodesic right-hand side for state (u, v, du, dv):
   * returns (du, dv, d²u, d²v) with ü = −Γ^u_ij ξ̇^i ξ̇^j.
   */
  geodesicRHS(state: number[]): number[] {
    const [u, v, du, dv] = state
    const G = this.christoffel(u, v)
    const ddu = -(G[0][0][0] * du * du + 2 * G[0][0][1] * du * dv + G[0][1][1] * dv * dv)
    const ddv = -(G[1][0][0] * du * du + 2 * G[1][0][1] * du * dv + G[1][1][1] * dv * dv)
    return [du, dv, ddu, ddv]
  }

  /** Speed of a parameter-space velocity (du, dv) under the metric. */
  metricSpeed(u: number, v: number, du: number, dv: number): number {
    const { E, F, G } = this.firstForm(u, v)
    return Math.sqrt(Math.max(E * du * du + 2 * F * du * dv + G * dv * dv, 0))
  }

  /**
   * Shoot a unit-speed geodesic from (u0, v0) in direction (du, dv)
   * (normalized w.r.t. the metric). Integrates with RK4 up to maxLength
   * arc-length units; stops at non-periodic chart boundaries.
   */
  geodesicPath(
    u0: number,
    v0: number,
    du0: number,
    dv0: number,
    maxLength: number,
    h = 0.01,
  ): { params: { u: number; v: number }[]; points: Vector3[] } {
    const speed = this.metricSpeed(u0, v0, du0, dv0)
    if (speed < REGULAR_EPS) return { params: [], points: [] }
    let state = [u0, v0, du0 / speed, dv0 / speed]
    const steps = Math.min(Math.ceil(maxLength / h), 20000)
    const params: { u: number; v: number }[] = [{ u: u0, v: v0 }]
    const points: Vector3[] = [this.point(u0, v0)]
    const f = (_t: number, y: number[]) => this.geodesicRHS(y)
    for (let i = 0; i < steps; i++) {
      state = rk4Step(f, i * h, state, h)
      let [u, v] = state
      if (this.uPeriodic) u = wrapToRange(u, this.uRange)
      else if (u < this.uRange.min || u > this.uRange.max) break
      if (this.vPeriodic) v = wrapToRange(v, this.vRange)
      else if (v < this.vRange.min || v > this.vRange.max) break
      if (this.uPeriodic || this.vPeriodic) {
        state = [u, v, state[2], state[3]]
      }
      params.push({ u, v })
      points.push(this.point(u, v))
    }
    return { params, points }
  }

  /**
   * Parallel-transport a tangent vector w = (wu, wv) along a dense
   * parameter-space path. Returns transported vectors per path sample.
   * Solves dw^k/ds = −Γ^k_ij w^i dξ^j/ds segmentwise with RK4.
   */
  parallelTransport(
    path: { u: number; v: number }[],
    w0: { wu: number; wv: number },
  ): { wu: number; wv: number }[] {
    const result: { wu: number; wv: number }[] = [{ ...w0 }]
    let w = [w0.wu, w0.wv]
    for (let i = 0; i < path.length - 1; i++) {
      const p0 = path[i]
      const p1 = path[i + 1]
      const du = p1.u - p0.u
      const dv = p1.v - p0.v
      // ds = segment arc length (approx via metric at midpoint)
      const mu = (p0.u + p1.u) / 2
      const mv = (p0.v + p1.v) / 2
      const ds = this.metricSpeed(mu, mv, du, dv)
      if (ds < 1e-12) {
        result.push({ wu: w[0], wv: w[1] })
        continue
      }
      // dξ^j/ds along the segment (constant approximation)
      const xiu = du / ds
      const xiv = dv / ds
      const f = (_t: number, y: number[]) => {
        const Gm = this.christoffel(mu, mv)
        return [
          -(Gm[0][0][0] * y[0] * xiu + Gm[0][0][1] * y[0] * xiv + Gm[0][1][0] * y[1] * xiu + Gm[0][1][1] * y[1] * xiv),
          -(Gm[1][0][0] * y[0] * xiu + Gm[1][0][1] * y[0] * xiv + Gm[1][1][0] * y[1] * xiu + Gm[1][1][1] * y[1] * xiv),
        ]
      }
      w = rk4Step(f, 0, w, ds)
      result.push({ wu: w[0], wv: w[1] })
    }
    return result
  }

  /**
   * Total Gaussian curvature ∬ K dA over the parameter domain
   * (midpoint rule on an n×m grid). For a closed surface this equals 2πχ.
   */
  totalGaussianCurvature(n = 96, m = 96): number {
    const du = rangeSpan(this.uRange) / n
    const dv = rangeSpan(this.vRange) / m
    let sum = 0
    for (let i = 0; i < n; i++) {
      const u = this.uRange.min + (i + 0.5) * du
      for (let j = 0; j < m; j++) {
        const v = this.vRange.min + (j + 0.5) * dv
        const area = this.areaElement(u, v)
        if (area < REGULAR_EPS) continue
        sum += this.gaussianCurvature(u, v) * area
      }
    }
    return sum * du * dv
  }

  /** Willmore energy ∬ H^2 dA (midpoint rule). */
  willmoreEnergy(n = 96, m = 96): number {
    const du = rangeSpan(this.uRange) / n
    const dv = rangeSpan(this.vRange) / m
    let sum = 0
    for (let i = 0; i < n; i++) {
      const u = this.uRange.min + (i + 0.5) * du
      for (let j = 0; j < m; j++) {
        const v = this.vRange.min + (j + 0.5) * dv
        const area = this.areaElement(u, v)
        if (area < REGULAR_EPS) continue
        const H = this.meanCurvature(u, v)
        sum += H * H * area
      }
    }
    return sum * du * dv
  }

  /** Total surface area ∬ dA (midpoint rule). */
  area(n = 96, m = 96): number {
    const du = rangeSpan(this.uRange) / n
    const dv = rangeSpan(this.vRange) / m
    let sum = 0
    for (let i = 0; i < n; i++) {
      const u = this.uRange.min + (i + 0.5) * du
      for (let j = 0; j < m; j++) {
        const v = this.vRange.min + (j + 0.5) * dv
        sum += this.areaElement(u, v)
      }
    }
    return sum * du * dv
  }

  /** Convert a tangent vector given in (du, dv) coordinates to 3D. */
  tangentTo3D(u: number, v: number, wu: number, wv: number): Vector3 {
    return this.ru(u, v).multiplyScalar(wu).addScaledVector(this.rv(u, v), wv)
  }
}
