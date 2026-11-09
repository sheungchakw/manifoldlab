import { Vector3 } from 'three'
import { ParametricSurface } from '@/math/surface'
import { surfaceCatalog } from '@/math/catalog'

const TAU = Math.PI * 2

/** "Vase": a surface of revolution with a throat, great for Clairaut. */
export function makeVase(): ParametricSurface {
  const rho = (v: number) => 0.95 + 0.4 * Math.sin(2.1 * v)
  return new ParametricSurface(
    (u, v) => new Vector3(rho(v) * Math.cos(u), 1.1 * v - 1.6, rho(v) * Math.sin(u)),
    { min: 0, max: TAU },
    { min: 0.15, max: 2.9 },
    { uPeriodic: true },
  )
}

const catalogPick = ['sphere', 'torus', 'pseudosphere', 'cylinder', 'cone', 'saddle']

export const geodesicSurfaceOptions: Record<string, string> = {
  ...Object.fromEntries(
    surfaceCatalog
      .filter((d) => catalogPick.includes(d.id))
      .map((d) => [d.name, d.id]),
  ),
  'Vase (surface of revolution)': 'vase',
}

export function buildGeodesicSurface(id: string): {
  def: { name: string; tex: string; description: string }
  surface: ParametricSurface
  /** Radius about the y-axis for revolution surfaces (Clairaut), else null. */
  revolutionRadius: ((u: number, v: number) => number) | null
} {
  if (id === 'vase') {
    return {
      def: {
        name: 'Vase',
        tex: String.raw`\mathbf{r}(u,v) = (\rho(v)\cos u,\ 1.1v,\ \rho(v)\sin u),\quad \rho(v) = 0.95 + 0.4\sin(2.1v)`,
        description:
          'A surface of revolution with a throat — geodesics are trapped or escape depending on the Clairaut constant.',
      },
      surface: makeVase(),
      revolutionRadius: (_u, v) => 0.95 + 0.4 * Math.sin(2.1 * v),
    }
  }
  const def = surfaceCatalog.find((d) => d.id === id) ?? surfaceCatalog[0]
  const surface = def.build()
  // All catalog surfaces here are (or approximate) revolution surfaces about y
  const radius = (u: number, v: number) => {
    const p = surface.point(u, v)
    return Math.hypot(p.x, p.z)
  }
  const revolution = ['sphere', 'torus', 'pseudosphere', 'cylinder', 'cone'].includes(id)
  return { def, surface, revolutionRadius: revolution ? radius : null }
}

/**
 * Convert an angle (measured from ru in the tangent plane) into a
 * parameter-space direction (du, dv).
 */
export function directionFromAngle(
  surface: ParametricSurface,
  u: number,
  v: number,
  angle: number,
): { du: number; dv: number } {
  const ru = surface.ru(u, v)
  const n = surface.normal(u, v)
  const e1 = ru.clone().normalize()
  const e2 = n.clone().cross(e1) // unit tangent ⊥ e1
  const W = e1
    .clone()
    .multiplyScalar(Math.cos(angle))
    .addScaledVector(e2, Math.sin(angle))
  // Solve gram system [E F; F G] [du dv]^T = [<W,ru>, <W,rv>]
  const rv = surface.rv(u, v)
  const { E, F, G } = surface.firstForm(u, v)
  const b0 = W.dot(ru)
  const b1 = W.dot(rv)
  const det = E * G - F * F
  if (Math.abs(det) < 1e-12) return { du: 1, dv: 0 }
  return {
    du: (G * b0 - F * b1) / det,
    dv: (-F * b0 + E * b1) / det,
  }
}
