import { Vector3 } from 'three'

/** Spherical linear interpolation between unit vectors a and b. */
export function slerp(a: Vector3, b: Vector3, t: number): Vector3 {
  const omega = a.angleTo(b)
  if (omega < 1e-9) return a.clone()
  const sinO = Math.sin(omega)
  return a
    .clone()
    .multiplyScalar(Math.sin((1 - t) * omega) / sinO)
    .addScaledVector(b, Math.sin(t * omega) / sinO)
}

/** Great-circle arc from a to b as n+1 points (unit sphere). */
export function greatCircleArc(a: Vector3, b: Vector3, n = 48): Vector3[] {
  return Array.from({ length: n + 1 }, (_, i) => slerp(a, b, i / n))
}

/**
 * Interior angle at vertex `at` of a spherical triangle (unit sphere),
 * measured between the great-circle arcs to `p1` and `p2`.
 * Uses the tangent vectors of the arcs at `at`.
 */
export function sphericalAngle(at: Vector3, p1: Vector3, p2: Vector3): number {
  // Tangent of arc(at → p1) at `at`: component of p1 perpendicular to `at`
  const t1 = p1.clone().addScaledVector(at, -p1.dot(at)).normalize()
  const t2 = p2.clone().addScaledVector(at, -p2.dot(at)).normalize()
  return t1.angleTo(t2)
}

/**
 * Solid angle (= area on the unit sphere) of the spherical triangle ABC,
 * via the Van Oosterom–Strackee formula — independent of the angle sum,
 * which makes it a genuine check of Girard's theorem.
 */
export function sphericalExcess(a: Vector3, b: Vector3, c: Vector3): number {
  const det = a.dot(b.clone().cross(c))
  const den =
    1 + a.dot(b) + b.dot(c) + c.dot(a)
  return Math.abs(2 * Math.atan2(det, den))
}

/**
 * Build a filled spherical triangle patch (unit sphere) as positions +
 * indices, subdividing rows parallel to edge BC toward vertex A.
 */
export function buildSphericalPatch(
  a: Vector3,
  b: Vector3,
  c: Vector3,
  rows = 28,
): { positions: Float32Array; indices: Uint32Array } {
  const positions: number[] = []
  const indices: number[] = []
  // Row i (0..rows): from arc(A→B) at t=i/rows to arc(A→C) at t=i/rows, i+1 points
  const rowStart: number[] = []
  for (let i = 0; i <= rows; i++) {
    rowStart.push(positions.length / 3)
    const t = i / rows
    const left = slerp(a, b, t)
    const right = slerp(a, c, t)
    for (let j = 0; j <= i; j++) {
      const p = i === 0 ? a.clone() : slerp(left, right, j / i)
      positions.push(p.x, p.y, p.z)
    }
  }
  for (let i = 0; i < rows; i++) {
    const r0 = rowStart[i]
    const r1 = rowStart[i + 1]
    for (let j = 0; j <= i; j++) {
      // triangle between row i (i+1 pts) and row i+1 (i+2 pts)
      indices.push(r0 + j, r1 + j, r1 + j + 1)
      if (j < i) indices.push(r0 + j, r1 + j + 1, r0 + j + 1)
    }
  }
  return {
    positions: new Float32Array(positions),
    indices: new Uint32Array(indices),
  }
}

/** Small arc (in the tangent plane at `at`) between two tangent directions. */
export function tangentAngleArc(
  at: Vector3,
  to1: Vector3,
  to2: Vector3,
  radius = 0.22,
  n = 16,
): Vector3[] {
  const t1 = to1.clone().addScaledVector(at, -to1.dot(at)).normalize()
  const t2 = to2.clone().addScaledVector(at, -to2.dot(at)).normalize()
  const angle = t1.angleTo(t2)
  const sign = Math.sign(t1.clone().cross(t2).dot(at)) || 1
  const axis = at.clone() // rotation axis for tangent vectors at `at`
  const pts: Vector3[] = []
  for (let i = 0; i <= n; i++) {
    const v = t1.clone().applyAxisAngle(axis, (sign * angle * i) / n)
    pts.push(at.clone().addScaledVector(v, radius / 1).normalize().multiplyScalar(1.005))
  }
  return pts
}
