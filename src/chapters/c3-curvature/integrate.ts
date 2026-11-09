import { Vector3 } from 'three'
import { ParametricSurface } from '@/math/surface'
import { wrapToRange } from '@/math/types'

interface UVDir {
  du: number
  dv: number
}

/**
 * Integrate one line of curvature through (u0, v0) following the given
 * principal family, using RK2 (midpoint) steps measured in arc length.
 * Eigenvector sign is tracked for continuity; the line stops at chart
 * boundaries and near umbilics (where the direction field is undefined).
 */
export function integratePrincipalLine(
  surface: ParametricSurface,
  u0: number,
  v0: number,
  family: 1 | 2,
  maxLength = 10,
  h = 0.025,
): Vector3[] {
  const rawDir = (u: number, v: number): (UVDir & { umbilic: boolean }) | null => {
    const { d1, d2, umbilic } = surface.principalDirectionsUV(u, v)
    if (umbilic) return null
    const d = family === 1 ? d1 : d2
    return { ...d, umbilic }
  }
  const align = (d: UVDir, prev: UVDir): UVDir =>
    d.du * prev.du + d.dv * prev.dv < 0 ? { du: -d.du, dv: -d.dv } : d

  const march = (startDir: UVDir): { u: number; v: number }[] => {
    const out: { u: number; v: number }[] = []
    let u = u0
    let v = v0
    let prev = startDir
    let traveled = 0
    for (let i = 0; i < 2000 && traveled < maxLength; i++) {
      const d0 = align(rawDir(u, v) ?? prev, prev)
      // midpoint
      const mu = u + (h / 2) * d0.du
      const mv = v + (h / 2) * d0.dv
      const dmRaw = rawDir(mu, mv)
      if (!dmRaw) break // walked into an umbilic
      const dm = align(dmRaw, d0)
      u += h * dm.du
      v += h * dm.dv
      traveled += h
      if (surface.uPeriodic) u = wrapToRange(u, surface.uRange)
      else if (u < surface.uRange.min || u > surface.uRange.max) break
      if (surface.vPeriodic) v = wrapToRange(v, surface.vRange)
      else if (v < surface.vRange.min || v > surface.vRange.max) break
      out.push({ u, v })
      prev = dm
    }
    return out
  }

  const seed = rawDir(u0, v0)
  if (!seed) return []
  const forward = march(seed)
  const backward = march({ du: -seed.du, dv: -seed.dv }).reverse()
  return [...backward, { u: u0, v: v0 }, ...forward].map(({ u, v }) =>
    surface.point(u, v),
  )
}

export interface UmbilicMarker {
  point: Vector3
  diff: number
}

/**
 * Locate approximate umbilics by grid search for local minima of |k1−k2|.
 * Returns [] when (nearly) every point is umbilic (sphere, plane).
 */
export function findUmbilics(
  surface: ParametricSurface,
  grid = 44,
  maxMarkers = 24,
): UmbilicMarker[] {
  const { uRange, vRange } = surface
  const diffs: number[][] = []
  let maxK = 1e-9
  for (let i = 0; i <= grid; i++) {
    const u = uRange.min + ((uRange.max - uRange.min) * i) / (grid + 1)
    diffs.push([])
    for (let j = 0; j <= grid; j++) {
      const v = vRange.min + ((vRange.max - vRange.min) * j) / (grid + 1)
      const { k1, k2 } = surface.principalCurvatures(u, v)
      maxK = Math.max(maxK, Math.abs(k1), Math.abs(k2))
      diffs[i].push(Math.abs(k1 - k2))
    }
  }
  const tol = Math.max(0.1 * maxK, 1e-4)
  const markers: UmbilicMarker[] = []
  for (let i = 1; i < grid; i++) {
    for (let j = 1; j < grid; j++) {
      const d = diffs[i][j]
      if (d > tol) continue
      const isMin =
        d <= diffs[i - 1][j] &&
        d <= diffs[i + 1][j] &&
        d <= diffs[i][j - 1] &&
        d <= diffs[i][j + 1] &&
        d <= diffs[i - 1][j - 1] &&
        d <= diffs[i + 1][j + 1] &&
        d <= diffs[i - 1][j + 1] &&
        d <= diffs[i + 1][j - 1]
      if (!isMin) continue
      const u = uRange.min + ((uRange.max - uRange.min) * i) / (grid + 1)
      const v = vRange.min + ((vRange.max - vRange.min) * j) / (grid + 1)
      markers.push({ point: surface.point(u, v), diff: d })
    }
  }
  // Umbilics everywhere (or numerically degenerate) — not interesting
  if (markers.length > maxMarkers) return []
  return markers
}

/** Sampled unit normals for the Gauss map point cloud. */
export function gaussMapSamples(surface: ParametricSurface, n = 28): Vector3[] {
  const pts: Vector3[] = []
  for (let i = 0; i < n; i++) {
    const u = surface.uRange.min + ((surface.uRange.max - surface.uRange.min) * (i + 0.5)) / n
    for (let j = 0; j < n; j++) {
      const v = surface.vRange.min + ((surface.vRange.max - surface.vRange.min) * (j + 0.5)) / n
      const normal = surface.normal(u, v)
      if (normal.lengthSq() > 1e-9) pts.push(normal.clone())
    }
  }
  return pts
}

/**
 * Isometric bending family of a flat strip into a cylinder:
 * alpha = 0 gives the plane, alpha = 1 a cylinder of radius 1.
 * K = 0 for every alpha — the Theorema Egregium made visible.
 */
export function makeBendingStrip(alpha: number): ParametricSurface {
  const a = Math.max(alpha, 1e-4)
  return new ParametricSurface(
    (u, v) => new Vector3(Math.sin(a * u) / a, v, (1 - Math.cos(a * u)) / a),
    { min: -2.7, max: 2.7 },
    { min: -1.4, max: 1.4 },
  )
}
