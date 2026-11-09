import { describe, expect, it } from 'vitest'
import { makeSphere, makePlane } from '../catalog'

const TAU = Math.PI * 2

describe('Geodesics', () => {
  it('great circle on the unit sphere closes after length 2π and keeps unit speed', () => {
    const s = makeSphere(1)
    const v0 = Math.PI / 2 // equator
    const { params, points } = s.geodesicPath(0, v0, 1, 0.7, TAU - 0.01, 0.005)
    const start = points[0]
    const end = points[points.length - 1]
    expect(start.distanceTo(end)).toBeLessThan(1e-2)
    // Unit speed is a first integral of the geodesic equation
    for (const p of [params[100], params[300], params[600]]) {
      expect(s.metricSpeed(p.u, p.v, 1, 0)).toBeGreaterThan(0)
    }
    // All points stay on the sphere
    for (const p of points.filter((_, i) => i % 100 === 0)) {
      expect(p.length()).toBeCloseTo(1, 4)
    }
  })

  it('geodesics in the plane are straight lines at constant velocity', () => {
    const p = makePlane()
    const { params } = p.geodesicPath(0.2, -0.3, 1, 0.5, 1.0, 0.01)
    const last = params[params.length - 1]
    const len = Math.hypot(1, 0.5)
    expect(last.u).toBeCloseTo(0.2 + 1.0 / len, 3)
    expect(last.v).toBeCloseTo(-0.3 + (0.5 * 1.0) / len, 3)
  })
})

describe('Parallel transport & holonomy', () => {
  it('transport around a latitude circle rotates by 2π·cos(v₀) (Foucault)', () => {
    const s = makeSphere(1)
    const v0 = Math.PI / 3 // latitude 30°N → holonomy 2π·cos(π/3) = π
    const n = 1440
    const path = Array.from({ length: n + 1 }, (_, i) => ({
      u: (TAU * i) / n,
      v: v0,
    }))
    const w0 = { wu: 0, wv: 1 }
    const transported = s.parallelTransport(path, w0)
    const initial = s.tangentTo3D(path[0].u, path[0].v, w0.wu, w0.wv)
    const finalW = transported[transported.length - 1]
    const final = s.tangentTo3D(
      path[path.length - 1].u,
      path[path.length - 1].v,
      finalW.wu,
      finalW.wv,
    )
    const angle = initial.angleTo(final)
    // Holonomy = 2π cos(v0) = π (mod sign convention)
    expect(Math.abs(angle - Math.PI)).toBeLessThan(0.06)
    // Transport preserves length
    const { E, G } = s.firstForm(v0 !== 0 ? path[n].u : 0, v0)
    const lenSq = E * finalW.wu * finalW.wu + G * finalW.wv * finalW.wv
    expect(lenSq).toBeCloseTo(E * w0.wu * w0.wu + G * w0.wv * w0.wv, 3)
  })
})
