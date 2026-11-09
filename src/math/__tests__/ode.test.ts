import { describe, expect, it } from 'vitest'
import { integrateRK4, integrateRK45 } from '../ode'

describe('ODE integrators', () => {
  const exp = (_t: number, y: number[]) => [y[0]]

  it("RK4 solves y' = y to machine-ish accuracy", () => {
    const { ys } = integrateRK4(exp, 0, [1], 2, 200)
    expect(ys[ys.length - 1][0]).toBeCloseTo(Math.E * Math.E, 5)
  })

  it("RK45 solves y' = y with adaptive steps", () => {
    const { ys } = integrateRK45(exp, 0, [1], 2, { tol: 1e-9 })
    expect(ys[ys.length - 1][0]).toBeCloseTo(Math.E * Math.E, 6)
  })

  it('RK45 solves the harmonic oscillator over a full period', () => {
    const harmonic = (_t: number, y: number[]) => [y[1], -y[0]]
    const { ys } = integrateRK45(harmonic, 0, [1, 0], 2 * Math.PI, { tol: 1e-9 })
    const [x, v] = ys[ys.length - 1]
    expect(x).toBeCloseTo(1, 5)
    expect(v).toBeCloseTo(0, 5)
  })

  it('RK45 handles backward integration', () => {
    const { ys } = integrateRK45(exp, 2, [Math.E * Math.E], 0, { tol: 1e-9 })
    expect(ys[ys.length - 1][0]).toBeCloseTo(1, 6)
  })
})
