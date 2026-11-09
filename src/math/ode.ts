/**
 * ODE integrators for systems y' = f(t, y) with y ∈ R^n.
 * RK4 (fixed step) for smooth cheap problems, RKF45 (adaptive) for
 * stiff/accuracy-critical ones like geodesics near singular charts.
 */

export type ODEFn = (t: number, y: number[]) => number[]

function addScaled(y: number[], k: number[], h: number): number[] {
  return y.map((yi, i) => yi + h * k[i])
}

export function rk4Step(f: ODEFn, t: number, y: number[], h: number): number[] {
  const k1 = f(t, y)
  const k2 = f(t + h / 2, addScaled(y, k1, h / 2))
  const k3 = f(t + h / 2, addScaled(y, k2, h / 2))
  const k4 = f(t + h, addScaled(y, k3, h))
  return y.map((yi, i) => yi + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]))
}

export interface Trajectory {
  ts: number[]
  ys: number[][]
}

/** Fixed-step RK4 over [t0, t1]. Returns the full trajectory including y0. */
export function integrateRK4(
  f: ODEFn,
  t0: number,
  y0: number[],
  t1: number,
  stepCount: number,
): Trajectory {
  const h = (t1 - t0) / stepCount
  const ts: number[] = [t0]
  const ys: number[][] = [y0.slice()]
  let t = t0
  let y = y0.slice()
  for (let i = 0; i < stepCount; i++) {
    y = rk4Step(f, t, y, h)
    t += h
    ts.push(t)
    ys.push(y)
  }
  return { ts, ys }
}

export interface RK45Options {
  /** Absolute error tolerance per unit step. */
  tol?: number
  /** Initial step size. */
  h0?: number
  hMin?: number
  hMax?: number
  maxSteps?: number
}

/** One RKF45 step: returns 4th/5th order estimates (Fehlberg coefficients). */
function rkf45Step(
  f: ODEFn,
  t: number,
  y: number[],
  h: number,
): { y4: number[]; y5: number[] } {
  const k1 = f(t, y)
  const k2 = f(t + h / 4, addScaled(y, k1, h / 4))
  const k3 = f(
    t + (3 * h) / 8,
    y.map((yi, i) => yi + h * ((3 / 32) * k1[i] + (9 / 32) * k2[i])),
  )
  const k4 = f(
    t + (12 * h) / 13,
    y.map(
      (yi, i) =>
        yi + h * ((1932 / 2197) * k1[i] - (7200 / 2197) * k2[i] + (7296 / 2197) * k3[i]),
    ),
  )
  const k5 = f(
    t + h,
    y.map(
      (yi, i) =>
        yi +
        h *
          ((439 / 216) * k1[i] - 8 * k2[i] + (3680 / 513) * k3[i] - (845 / 4104) * k4[i]),
    ),
  )
  const k6 = f(
    t + h / 2,
    y.map(
      (yi, i) =>
        yi +
        h *
          (-(8 / 27) * k1[i] +
            2 * k2[i] -
            (3544 / 2565) * k3[i] +
            (1859 / 4104) * k4[i] -
            (11 / 40) * k5[i]),
    ),
  )
  const y4 = y.map(
    (yi, i) =>
      yi +
      h * ((25 / 216) * k1[i] + (1408 / 2565) * k3[i] + (2197 / 4104) * k4[i] - (1 / 5) * k5[i]),
  )
  const y5 = y.map(
    (yi, i) =>
      yi +
      h *
        ((16 / 135) * k1[i] +
          (6656 / 12825) * k3[i] +
          (28561 / 56430) * k4[i] -
          (9 / 50) * k5[i] +
          (2 / 55) * k6[i]),
  )
  return { y4, y5 }
}

/**
 * Adaptive RKF45 from t0 to t1 (either direction).
 * Returns accepted samples; the last sample lands exactly on t1.
 */
export function integrateRK45(
  f: ODEFn,
  t0: number,
  y0: number[],
  t1: number,
  opts: RK45Options = {},
): Trajectory {
  const { tol = 1e-8, h0 = 1e-3, hMin = 1e-10, hMax = 0.5, maxSteps = 20000 } = opts
  const direction = Math.sign(t1 - t0) || 1
  let t = t0
  let y = y0.slice()
  let h = Math.min(Math.abs(h0), Math.abs(t1 - t0)) * direction
  const ts: number[] = [t0]
  const ys: number[][] = [y.slice()]

  for (let step = 0; step < maxSteps; step++) {
    if ((t - t1) * direction >= 0) break
    if ((t + h - t1) * direction > 0) h = t1 - t
    const { y4, y5 } = rkf45Step(f, t, y, h)
    const err = Math.max(...y5.map((v, i) => Math.abs(v - y4[i])), 1e-16)
    // Step-size controller
    const s = Math.min(4, Math.max(0.1, 0.84 * Math.pow(tol / err, 0.25)))
    if (err <= tol) {
      t += h
      y = y5
      ts.push(t)
      ys.push(y.slice())
    }
    h *= s
    if (Math.abs(h) > hMax) h = hMax * direction
    if (Math.abs(h) < hMin) {
      // Give up adapting; take a tiny forced step to avoid infinite loops.
      h = hMin * direction
      t += h
      y = y5
      ts.push(t)
      ys.push(y.slice())
    }
  }
  return { ts, ys }
}
