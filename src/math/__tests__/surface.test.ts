import { describe, expect, it } from 'vitest'
import {
  makeCatenoid,
  makeCylinder,
  makeEnneper,
  makeMonkeySaddle,
  makePlane,
  makeSphere,
  makeTorus,
} from '../catalog'

describe('ParametricSurface: fundamental forms', () => {
  it('sphere of radius R: E = R²sin²v, F = 0, G = R²; K = 1/R²; |H| = 1/R', () => {
    const R = 1.5
    const s = makeSphere(R)
    const u = 0.7
    const v = 1.1
    const { E, F, G } = s.firstForm(u, v)
    expect(E).toBeCloseTo(R * R * Math.sin(v) ** 2, 3)
    expect(F).toBeCloseTo(0, 5)
    expect(G).toBeCloseTo(R * R, 3)
    expect(s.gaussianCurvature(u, v)).toBeCloseTo(1 / (R * R), 3)
    expect(Math.abs(s.meanCurvature(u, v))).toBeCloseTo(1 / R, 3)
    const { k1, k2 } = s.principalCurvatures(u, v)
    expect(Math.abs(k1)).toBeCloseTo(1 / R, 3)
    expect(Math.abs(k2)).toBeCloseTo(1 / R, 3)
    expect(s.info(u, v).umbilic).toBe(true)
    expect(s.areaElement(u, v)).toBeCloseTo(R * R * Math.sin(v), 3)
  })

  it('plane: K = H = 0, classified planar, area element 1', () => {
    const p = makePlane()
    expect(p.gaussianCurvature(0.3, -0.4)).toBeCloseTo(0, 6)
    expect(p.meanCurvature(0.3, -0.4)).toBeCloseTo(0, 6)
    expect(p.classify(0.3, -0.4)).toBe('planar')
    expect(p.areaElement(0.3, -0.4)).toBeCloseTo(1, 5)
  })

  it('cylinder: K = 0 (developable), |H| = 1/(2r)', () => {
    const r = 0.9
    const c = makeCylinder(r)
    for (const [u, v] of [
      [1.0, 0.5],
      [3.0, -1.0],
    ]) {
      expect(c.gaussianCurvature(u, v)).toBeCloseTo(0, 4)
      expect(Math.abs(c.meanCurvature(u, v))).toBeCloseTo(1 / (2 * r), 3)
    }
  })

  it('torus: K > 0 on the outer rim, K < 0 on the inner rim, K = 0 on top circle', () => {
    const R = 1.6
    const r = 0.65
    const t = makeTorus(R, r)
    expect(t.gaussianCurvature(1.3, 0)).toBeGreaterThan(0.01)
    expect(t.gaussianCurvature(1.3, Math.PI)).toBeLessThan(-0.01)
    expect(t.gaussianCurvature(1.3, Math.PI / 2)).toBeCloseTo(0, 3)
    // Analytic value at outer rim: cos v / (r (R + r cos v)) = 1/(r(R+r))
    expect(t.gaussianCurvature(1.3, 0)).toBeCloseTo(1 / (r * (R + r)), 3)
  })

  it('catenoid is minimal: H ≈ 0, K < 0 away from the waist only at neck K = -1/c²... (H=0 everywhere)', () => {
    const c = 0.6
    const cat = makeCatenoid(c)
    for (const [u, v] of [
      [0.8, 0.0],
      [2.0, 1.0],
      [4.0, -0.9],
    ]) {
      expect(Math.abs(cat.meanCurvature(u, v))).toBeLessThan(1e-3)
      expect(cat.gaussianCurvature(u, v)).toBeLessThan(0)
    }
  })

  it("Enneper's surface is minimal", () => {
    const e = makeEnneper()
    for (const [u, v] of [
      [0.3, 0.4],
      [-0.8, 0.6],
      [0.9, -0.2],
    ]) {
      expect(Math.abs(e.meanCurvature(u, v))).toBeLessThan(1e-3)
    }
  })

  it('monkey saddle: planar point at origin, K < 0 elsewhere', () => {
    const m = makeMonkeySaddle()
    expect(m.classify(0, 0)).toBe('planar')
    expect(m.gaussianCurvature(0.5, 0.4)).toBeLessThan(0)
    expect(m.gaussianCurvature(0, 0)).toBeCloseTo(0, 4)
  })

  it('sphere is elliptic everywhere; torus has all three non-planar classes', () => {
    const s = makeSphere()
    expect(s.classify(1.0, 1.0)).toBe('elliptic')
    const t = makeTorus()
    expect(t.classify(0.5, 0)).toBe('elliptic')
    expect(t.classify(0.5, Math.PI)).toBe('hyperbolic')
    expect(t.classify(0.5, Math.PI / 2)).toBe('parabolic')
  })

  it('principal directions are orthogonal unit tangent vectors (torus, non-umbilic)', () => {
    const t = makeTorus()
    const { dir1, dir2 } = t.principalDirections(1.3, 0.7)
    expect(dir1.length()).toBeCloseTo(1, 5)
    expect(dir2.length()).toBeCloseTo(1, 5)
    expect(dir1.dot(dir2)).toBeCloseTo(0, 4)
    // Both perpendicular to the normal
    const n = t.normal(1.3, 0.7)
    expect(dir1.dot(n)).toBeCloseTo(0, 4)
    expect(dir2.dot(n)).toBeCloseTo(0, 4)
  })
})

describe('ParametricSurface: integral invariants', () => {
  it('∬K dA = 4π for the sphere (Gauss–Bonnet, χ = 2)', () => {
    const s = makeSphere(1.5)
    expect(s.totalGaussianCurvature(64, 48)).toBeCloseTo(4 * Math.PI, 1)
  })

  it('∬K dA = 0 for the torus (Gauss–Bonnet, χ = 0)', () => {
    const t = makeTorus()
    expect(Math.abs(t.totalGaussianCurvature(64, 48))).toBeLessThan(0.05)
  })

  it('sphere area ≈ 4πR²', () => {
    const R = 1.5
    const s = makeSphere(R)
    expect(s.area(80, 60)).toBeCloseTo(4 * Math.PI * R * R, 0)
  })

  it('Willmore energy of a round sphere is 4π (minimum)', () => {
    const s = makeSphere(1.5)
    expect(s.willmoreEnergy(64, 48)).toBeCloseTo(4 * Math.PI, 1)
  })
})

describe('ParametricSurface: Christoffel symbols', () => {
  it('sphere: Γ^u_uv = cot v, Γ^v_uu = −sin v cos v', () => {
    const s = makeSphere(1.5)
    const u = 0.8
    const v = 1.0
    const G = s.christoffel(u, v)
    // Γ[k][i][j], indices 0 = u, 1 = v
    expect(G[0][0][1]).toBeCloseTo(Math.cos(v) / Math.sin(v), 2) // Γ^u_uv
    expect(G[1][0][0]).toBeCloseTo(-Math.sin(v) * Math.cos(v), 2) // Γ^v_uu
    expect(G[0][1][1]).toBeCloseTo(0, 3) // Γ^u_vv
  })

  it('plane: all Christoffel symbols vanish', () => {
    const p = makePlane()
    const G = p.christoffel(0.4, -0.7)
    for (const k of [0, 1])
      for (const i of [0, 1])
        for (const j of [0, 1]) expect(Math.abs(G[k][i][j])).toBeLessThan(1e-6)
  })
})
