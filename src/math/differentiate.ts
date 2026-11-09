import { Vector3 } from 'three'
import type { CurveFn, SurfaceFn } from './types'

/**
 * Numerical differentiation via central differences.
 * Step sizes scale with the evaluation point to balance truncation and
 * roundoff error for the analytic parametrizations used across the site.
 */

function stepAt(x: number, base = 1e-5): number {
  return base * Math.max(1, Math.abs(x))
}

/** r'(t) */
export function dCurve(f: CurveFn, t: number, h = stepAt(t)): Vector3 {
  return f(t + h).sub(f(t - h)).multiplyScalar(1 / (2 * h))
}

/** r''(t) */
export function d2Curve(f: CurveFn, t: number, h = stepAt(t, 1e-4)): Vector3 {
  const fp = f(t + h)
  const f0 = f(t)
  const fm = f(t - h)
  return fp.add(fm).addScaledVector(f0, -2).multiplyScalar(1 / (h * h))
}

/** r'''(t) */
export function d3Curve(f: CurveFn, t: number, h = stepAt(t, 5e-4)): Vector3 {
  return f(t + 2 * h)
    .addScaledVector(f(t + h), -2)
    .addScaledVector(f(t - h), 2)
    .sub(f(t - 2 * h))
    .multiplyScalar(1 / (2 * h * h * h))
}

/** ∂r/∂u */
export function partialU(f: SurfaceFn, u: number, v: number, h = stepAt(u)): Vector3 {
  return f(u + h, v).sub(f(u - h, v)).multiplyScalar(1 / (2 * h))
}

/** ∂r/∂v */
export function partialV(f: SurfaceFn, u: number, v: number, h = stepAt(v)): Vector3 {
  return f(u, v + h).sub(f(u, v - h)).multiplyScalar(1 / (2 * h))
}

/** ∂²r/∂u² */
export function partialUU(f: SurfaceFn, u: number, v: number, h = stepAt(u, 1e-4)): Vector3 {
  const fp = f(u + h, v)
  const f0 = f(u, v)
  const fm = f(u - h, v)
  return fp.add(fm).addScaledVector(f0, -2).multiplyScalar(1 / (h * h))
}

/** ∂²r/∂v² */
export function partialVV(f: SurfaceFn, u: number, v: number, h = stepAt(v, 1e-4)): Vector3 {
  const fp = f(u, v + h)
  const f0 = f(u, v)
  const fm = f(u, v - h)
  return fp.add(fm).addScaledVector(f0, -2).multiplyScalar(1 / (h * h))
}

/** ∂²r/∂u∂v */
export function partialUV(f: SurfaceFn, u: number, v: number, h = stepAt(Math.max(Math.abs(u), Math.abs(v)), 1e-4)): Vector3 {
  return f(u + h, v + h)
    .sub(f(u + h, v - h))
    .sub(f(u - h, v + h))
    .add(f(u - h, v - h))
    .multiplyScalar(1 / (4 * h * h))
}

/** Central difference of a scalar function of two variables, along u (dir=0) or v (dir=1). */
export function dScalar(
  g: (u: number, v: number) => number,
  u: number,
  v: number,
  dir: 0 | 1,
  h = 1e-4,
): number {
  if (dir === 0) return (g(u + h, v) - g(u - h, v)) / (2 * h)
  return (g(u, v + h) - g(u, v - h)) / (2 * h)
}
