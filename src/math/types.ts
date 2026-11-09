import type { Vector3 } from 'three'

/** Parametric curve r(t) in R^3. */
export type CurveFn = (t: number) => Vector3

/** Parametric surface r(u, v) in R^3. */
export type SurfaceFn = (u: number, v: number) => Vector3

export interface Range {
  min: number
  max: number
}

export function rangeSpan(r: Range): number {
  return r.max - r.min
}

export function clampToRange(x: number, r: Range): number {
  return Math.min(r.max, Math.max(r.min, x))
}

/** Wrap x into [min, max) for periodic coordinates. */
export function wrapToRange(x: number, r: Range): number {
  const span = rangeSpan(r)
  let y = (x - r.min) % span
  if (y < 0) y += span
  return r.min + y
}
