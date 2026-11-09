import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import { ParametricCurve } from '../curve'
import { makeCircle, makeHelix, makeTrefoil, makeViviani } from '../catalog'

const TAU = Math.PI * 2

describe('ParametricCurve: known analytic values', () => {
  it('helix has constant κ = a/(a²+b²) and τ = b/(a²+b²)', () => {
    const a = 1.2
    const b = 0.35
    const helix = makeHelix(a, b, 3)
    for (const t of [0.5, 3.3, 7.7, 12.0]) {
      expect(helix.curvature(t)).toBeCloseTo(a / (a * a + b * b), 4)
      expect(helix.torsion(t)).toBeCloseTo(b / (a * a + b * b), 4)
    }
  })

  it('circle has κ = 1/R, τ = 0, length 2πR, total curvature 2π', () => {
    const R = 1.5
    const circle = makeCircle(R)
    for (const t of [0.1, 1.7, 4.2]) {
      expect(circle.curvature(t)).toBeCloseTo(1 / R, 4)
      expect(Math.abs(circle.torsion(t))).toBeLessThan(1e-4)
    }
    expect(circle.arcLength()).toBeCloseTo(TAU * R, 2)
    expect(circle.totalCurvature()).toBeCloseTo(TAU, 2)
  })

  it('arc-length reparametrization puts the circle quarter-point at (0, R, 0)', () => {
    const R = 1.5
    const circle = makeCircle(R)
    const table = circle.arcLengthTable()
    const p = circle.pointAtArcLength((TAU * R) / 4, table)
    expect(p.x).toBeCloseTo(0, 3)
    expect(p.y).toBeCloseTo(R, 3)
    expect(p.z).toBeCloseTo(0, 3)
  })

  it('Frenet frame is orthonormal and right-handed on the trefoil', () => {
    const trefoil = makeTrefoil()
    for (const t of [0.3, 2.1, 4.9]) {
      const frame = trefoil.frenetFrame(t)
      expect(frame).not.toBeNull()
      const { T, N, B } = frame!
      expect(T.length()).toBeCloseTo(1, 6)
      expect(N.length()).toBeCloseTo(1, 6)
      expect(B.length()).toBeCloseTo(1, 6)
      expect(T.dot(N)).toBeCloseTo(0, 5)
      expect(T.dot(B)).toBeCloseTo(0, 5)
      // B = T × N (right-handed)
      const cross = T.clone().cross(N)
      expect(cross.distanceTo(B)).toBeCloseTo(0, 5)
    }
  })

  it('osculating circle of a circle is the circle itself', () => {
    const R = 1.5
    const circle = makeCircle(R)
    const osc = circle.osculatingCircle(1.0)
    expect(osc).not.toBeNull()
    expect(osc!.radius).toBeCloseTo(R, 3)
    expect(osc!.center.length()).toBeCloseTo(0, 3)
  })

  it('straight line has zero curvature and no Frenet frame', () => {
    const line = new ParametricCurve(
      (t) => new Vector3(t, 2 * t, -t),
      { min: -1, max: 1 },
    )
    expect(line.curvature(0.3)).toBeCloseTo(0, 6)
    expect(line.frenetFrame(0.3)).toBeNull()
  })

  it("Viviani's curve closes after t = 4π and stays on the sphere", () => {
    const a = 1
    const viv = makeViviani(a)
    const start = viv.point(0)
    const end = viv.point(2 * TAU)
    expect(start.distanceTo(end)).toBeLessThan(1e-6)
    // All points lie on the sphere of radius 2a centered at the origin
    const t = 2.2
    const p = viv.point(t)
    expect(p.length()).toBeCloseTo(2 * a, 6)
    // ... and on the cylinder (x − a)² + y² = a²
    const q = viv.point(t)
    expect((q.x - a) ** 2 + q.y ** 2).toBeCloseTo(a * a, 6)
  })

  it('trefoil total curvature satisfies Fary–Milnor (≥ 4π)', () => {
    const trefoil = makeTrefoil()
    expect(trefoil.totalCurvature()).toBeGreaterThan(TAU * 2 - 0.05)
  })

  it('rotation-minimizing frames stay orthonormal along a knot', () => {
    const trefoil = makeTrefoil()
    const frames = trefoil.rotationMinimizingFrames(64)
    for (const { frame } of frames) {
      expect(Math.abs(frame.T.dot(frame.N))).toBeLessThan(1e-6)
      expect(Math.abs(frame.T.dot(frame.B))).toBeLessThan(1e-6)
      expect(frame.N.length()).toBeCloseTo(1, 6)
    }
  })
})
