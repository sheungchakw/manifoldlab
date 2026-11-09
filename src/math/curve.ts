import { Vector3 } from 'three'
import type { CurveFn, Range } from './types'
import { dCurve, d2Curve, d3Curve } from './differentiate'
import { rangeSpan } from './types'

export interface FrenetFrame {
  T: Vector3
  N: Vector3
  B: Vector3
}

export interface OsculatingCircle {
  center: Vector3
  radius: number
  /** Unit normal of the osculating plane (= binormal B). */
  planeNormal: Vector3
  /** Unit principal normal N (points toward the center). */
  toward: Vector3
}

export interface ArcLengthTable {
  ts: number[]
  ss: number[]
  total: number
}

const SPEED_EPS = 1e-9
const CURVATURE_EPS = 1e-7

/**
 * A regular parametric curve r(t) in R^3 with derived differential-geometric
 * quantities. All derivatives are numeric (central differences), which keeps
 * the class agnostic to how the parametrization was written.
 */
export class ParametricCurve {
  readonly fn: CurveFn
  readonly range: Range
  readonly closed: boolean

  constructor(fn: CurveFn, range: Range, closed = false) {
    this.fn = fn
    this.range = range
    this.closed = closed
  }

  point(t: number): Vector3 {
    return this.fn(t)
  }

  /** r'(t) */
  velocity(t: number): Vector3 {
    return dCurve(this.fn, t)
  }

  /** r''(t) */
  acceleration(t: number): Vector3 {
    return d2Curve(this.fn, t)
  }

  /** r'''(t) */
  jerk(t: number): Vector3 {
    return d3Curve(this.fn, t)
  }

  speed(t: number): number {
    return this.velocity(t).length()
  }

  /** Unit tangent T = r'/|r'|. Zero vector at singular points. */
  tangent(t: number): Vector3 {
    const v = this.velocity(t)
    const len = v.length()
    return len < SPEED_EPS ? v : v.divideScalar(len)
  }

  /** Curvature κ = |r' × r''| / |r'|^3 (parametrization independent). */
  curvature(t: number): number {
    const v = this.velocity(t)
    const a = this.acceleration(t)
    const cross = v.clone().cross(a)
    const speed = v.length()
    if (speed < SPEED_EPS) return 0
    return cross.length() / (speed * speed * speed)
  }

  /** Torsion τ = ((r' × r'') · r''') / |r' × r''|^2. 0 where κ = 0. */
  torsion(t: number): number {
    const v = this.velocity(t)
    const a = this.acceleration(t)
    const j = this.jerk(t)
    const cross = v.clone().cross(a)
    const denom = cross.lengthSq()
    if (denom < CURVATURE_EPS * CURVATURE_EPS) return 0
    return cross.dot(j) / denom
  }

  /**
   * Frenet frame {T, N, B}. Returns null near inflection points (κ ≈ 0),
   * where the Frenet frame is undefined; callers should fall back to a
   * rotation-minimizing frame there.
   */
  frenetFrame(t: number): FrenetFrame | null {
    const v = this.velocity(t)
    if (v.length() < SPEED_EPS) return null
    const a = this.acceleration(t)
    const b = v.clone().cross(a)
    if (b.length() < CURVATURE_EPS) return null
    const T = v.clone().normalize()
    const B = b.normalize()
    const N = B.clone().cross(T)
    return { T, N, B }
  }

  /** Osculating circle at t (radius 1/κ in the osculating plane). */
  osculatingCircle(t: number): OsculatingCircle | null {
    const frame = this.frenetFrame(t)
    if (!frame) return null
    const kappa = this.curvature(t)
    if (kappa < CURVATURE_EPS) return null
    const radius = 1 / kappa
    const center = this.point(t).addScaledVector(frame.N, radius)
    return { center, radius, planeNormal: frame.B, toward: frame.N }
  }

  /**
   * Cumulative arc-length table from chord sums over `samples` segments.
   * Adequate for reparametrization of smooth catalog curves.
   */
  arcLengthTable(samples = 2048): ArcLengthTable {
    const { min } = this.range
    const ts: number[] = []
    const ss: number[] = []
    let total = 0
    let prev = this.point(min)
    ts.push(min)
    ss.push(0)
    for (let i = 1; i <= samples; i++) {
      const t = min + (rangeSpan(this.range) * i) / samples
      const p = this.point(t)
      total += p.distanceTo(prev)
      ts.push(t)
      ss.push(total)
      prev = p
    }
    return { ts, ss, total }
  }

  arcLength(samples = 2048): number {
    return this.arcLengthTable(samples).total
  }

  /** Invert the arc-length table: find t with s(t) = s (clamped). */
  parameterAtArcLength(s: number, table?: ArcLengthTable): number {
    const tbl = table ?? this.arcLengthTable()
    const target = Math.min(Math.max(s, 0), tbl.total)
    // Binary search
    let lo = 0
    let hi = tbl.ss.length - 1
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1
      if (tbl.ss[mid] <= target) lo = mid
      else hi = mid
    }
    const s0 = tbl.ss[lo]
    const s1 = tbl.ss[hi]
    const alpha = s1 > s0 ? (target - s0) / (s1 - s0) : 0
    return tbl.ts[lo] + alpha * (tbl.ts[hi] - tbl.ts[lo])
  }

  pointAtArcLength(s: number, table?: ArcLengthTable): Vector3 {
    return this.point(this.parameterAtArcLength(s, table))
  }

  /** Total curvature ∫ κ ds over the whole curve. */
  totalCurvature(samples = 2048): number {
    const { min } = this.range
    const dt = rangeSpan(this.range) / samples
    let sum = 0
    for (let i = 0; i < samples; i++) {
      const t = min + (i + 0.5) * dt
      sum += this.curvature(t) * this.speed(t)
    }
    return sum * dt
  }

  /**
   * Rotation-minimizing frames along the curve (double-reflection method,
   * Wang–Jüttler–Zheng–Liu 2008). Stable through inflection points, unlike
   * the Frenet frame. Returns n+1 frames matching n+1 sample parameters.
   */
  rotationMinimizingFrames(n = 256): { t: number; frame: FrenetFrame }[] {
    const { min } = this.range
    const span = rangeSpan(this.range)
    const params: number[] = []
    const points: Vector3[] = []
    const tangents: Vector3[] = []
    for (let i = 0; i <= n; i++) {
      const t = min + (span * i) / n
      params.push(t)
      points.push(this.point(t))
      tangents.push(this.tangent(t))
    }
    // Initial reference vector: least-aligned world axis crossed with T0.
    const T0 = tangents[0]
    const axis =
      Math.abs(T0.x) < 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0)
    let r = axis.clone().cross(T0).normalize()
    if (r.lengthSq() < 1e-12) r = new Vector3(0, 0, 1).cross(T0).normalize()

    const frames: { t: number; frame: FrenetFrame }[] = []
    frames.push({
      t: params[0],
      frame: { T: T0, N: r.clone(), B: T0.clone().cross(r).normalize() },
    })
    for (let i = 0; i < n; i++) {
      const v1 = points[i + 1].clone().sub(points[i])
      const c1 = v1.lengthSq()
      const tNext = tangents[i + 1]
      let rNext: Vector3
      if (c1 < 1e-14 || tNext.lengthSq() < 1e-8) {
        rNext = r.clone()
      } else {
        const rL = r.clone().addScaledVector(v1, (-2 * v1.dot(r)) / c1)
        const tL = tangents[i].clone().addScaledVector(v1, (-2 * v1.dot(tangents[i])) / c1)
        const v2 = tNext.clone().sub(tL)
        const c2 = v2.lengthSq()
        rNext = c2 < 1e-14 ? rL : rL.addScaledVector(v2, (-2 * v2.dot(rL)) / c2)
        rNext.normalize()
      }
      frames.push({
        t: params[i + 1],
        frame: { T: tNext, N: rNext.clone(), B: tNext.clone().cross(rNext).normalize() },
      })
      r = rNext
    }
    return frames
  }
}
