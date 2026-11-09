import { Vector3 } from 'three'
import { ParametricCurve } from './curve'
import { ParametricSurface } from './surface'

export interface CurveDef {
  id: string
  name: string
  /** LaTeX of the parametrization (String.raw-safe). */
  tex: string
  description: string
  build: () => ParametricCurve
}

export interface SurfaceDef {
  id: string
  name: string
  tex: string
  description: string
  build: () => ParametricSurface
}

const TAU = Math.PI * 2

/* ---------------------------------- Curves ---------------------------------- */

export function makeCircle(R = 1.5): ParametricCurve {
  return new ParametricCurve(
    (t) => new Vector3(R * Math.cos(t), R * Math.sin(t), 0),
    { min: 0, max: TAU },
    true,
  )
}

export function makeHelix(a = 1.2, b = 0.35, turns = 3): ParametricCurve {
  return new ParametricCurve(
    (t) => new Vector3(a * Math.cos(t), a * Math.sin(t), b * t),
    { min: 0, max: turns * TAU },
  )
}

export function makeTorusKnot(p = 2, q = 3, R = 1.6, r = 0.7): ParametricCurve {
  return new ParametricCurve(
    (t) =>
      new Vector3(
        (R + r * Math.cos(q * t)) * Math.cos(p * t),
        (R + r * Math.cos(q * t)) * Math.sin(p * t),
        r * Math.sin(q * t),
      ),
    { min: 0, max: TAU },
    true,
  )
}

/** Trefoil as a classic (2,3)-style immersion with nicer thickness. */
export function makeTrefoil(): ParametricCurve {
  return new ParametricCurve(
    (t) =>
      new Vector3(
        Math.sin(t) + 2 * Math.sin(2 * t),
        Math.cos(t) - 2 * Math.cos(2 * t),
        -Math.sin(3 * t),
      ).multiplyScalar(0.55),
    { min: 0, max: TAU },
    true,
  )
}

/** Figure-eight knot 4_1. */
export function makeFigureEightKnot(): ParametricCurve {
  return new ParametricCurve(
    (t) =>
      new Vector3(
        (2 + Math.cos(2 * t)) * Math.cos(3 * t),
        (2 + Math.cos(2 * t)) * Math.sin(3 * t),
        Math.sin(4 * t),
      ).multiplyScalar(0.6),
    { min: 0, max: TAU },
    true,
  )
}

/** Viviani's curve: intersection of a sphere and a tangent cylinder. */
export function makeViviani(a = 1): ParametricCurve {
  return new ParametricCurve(
    (t) =>
      new Vector3(
        a * (1 + Math.cos(t)),
        a * Math.sin(t),
        2 * a * Math.sin(t / 2),
      ),
    { min: 0, max: 2 * TAU },
    true,
  )
}

/** Twisted cubic (t, t^2, t^3) — the canonical rational space curve. */
export function makeTwistedCubic(): ParametricCurve {
  return new ParametricCurve((t) => new Vector3(t, t * t, t * t * t), {
    min: -1.4,
    max: 1.4,
  })
}

/** Conical helix spiraling on a cone. */
export function makeConicalHelix(turns = 5): ParametricCurve {
  return new ParametricCurve(
    (t) => {
      const s = 1 - t / (turns * TAU)
      return new Vector3(
        1.6 * s * Math.cos(t),
        1.6 * s * Math.sin(t),
        2.2 * (1 - s),
      )
    },
    { min: 0, max: turns * TAU },
  )
}

export const curveCatalog: CurveDef[] = [
  {
    id: 'helix',
    name: 'Circular helix',
    tex: String.raw`\gamma(t) = (a\cos t,\ a\sin t,\ bt)`,
    description: 'Constant curvature and torsion: κ = a/(a²+b²), τ = b/(a²+b²).',
    build: () => makeHelix(),
  },
  {
    id: 'circle',
    name: 'Circle',
    tex: String.raw`\gamma(t) = (R\cos t,\ R\sin t,\ 0)`,
    description: 'κ = 1/R, τ = 0. The Frenet frame spins uniformly.',
    build: () => makeCircle(),
  },
  {
    id: 'trefoil',
    name: 'Trefoil knot',
    tex: String.raw`\gamma(t) = (\sin t + 2\sin 2t,\ \cos t - 2\cos 2t,\ -\sin 3t)`,
    description: 'The simplest nontrivial knot. Total curvature > 4π (Fary–Milnor).',
    build: () => makeTrefoil(),
  },
  {
    id: 'figure8',
    name: 'Figure-eight knot',
    tex: String.raw`\gamma(t) = ((2+\cos 2t)\cos 3t,\ (2+\cos 2t)\sin 3t,\ \sin 4t)`,
    description: 'The knot 4₁ — the simplest hyperbolic knot.',
    build: () => makeFigureEightKnot(),
  },
  {
    id: 'torusknot',
    name: 'Torus knot (2,5)',
    tex: String.raw`\gamma(t) = ((R + r\cos qt)\cos pt,\ (R + r\cos qt)\sin pt,\ r\sin qt)`,
    description: 'A knot winding p times around the torus axis and q times through the hole.',
    build: () => makeTorusKnot(2, 5),
  },
  {
    id: 'viviani',
    name: "Viviani's curve",
    tex: String.raw`\gamma(t) = (a(1+\cos t),\ a\sin t,\ 2a\sin\tfrac{t}{2})`,
    description: 'Intersection of a sphere with a cylinder through its center.',
    build: () => makeViviani(),
  },
  {
    id: 'twistedcubic',
    name: 'Twisted cubic',
    tex: String.raw`\gamma(t) = (t,\ t^2,\ t^3)`,
    description: 'The canonical non-planar algebraic space curve.',
    build: () => makeTwistedCubic(),
  },
  {
    id: 'conicalhelix',
    name: 'Conical helix',
    tex: String.raw`\gamma(t) = (s\cos t,\ s\sin t,\ h(1-s)),\quad s = 1 - \tfrac{t}{T}`,
    description: 'A helix climbing a cone; curvature grows as the radius shrinks.',
    build: () => makeConicalHelix(),
  },
]

/* --------------------------------- Surfaces --------------------------------- */

export function makeSphere(R = 1.5): ParametricSurface {
  // v slightly inside the poles to keep the chart regular
  return new ParametricSurface(
    (u, v) =>
      new Vector3(
        R * Math.sin(v) * Math.cos(u),
        R * Math.cos(v),
        R * Math.sin(v) * Math.sin(u),
      ),
    { min: 0, max: TAU },
    { min: 0.001, max: Math.PI - 0.001 },
    { uPeriodic: true },
  )
}

export function makeTorus(R = 1.6, r = 0.65): ParametricSurface {
  return new ParametricSurface(
    (u, v) =>
      new Vector3(
        (R + r * Math.cos(v)) * Math.cos(u),
        r * Math.sin(v),
        (R + r * Math.cos(v)) * Math.sin(u),
      ),
    { min: 0, max: TAU },
    { min: 0, max: TAU },
    { uPeriodic: true, vPeriodic: true },
  )
}

export function makePlane(size = 1.8): ParametricSurface {
  return new ParametricSurface(
    (u, v) => new Vector3(u, 0, v),
    { min: -size, max: size },
    { min: -size, max: size },
  )
}

export function makeCylinder(r = 0.9, h = 3): ParametricSurface {
  return new ParametricSurface(
    (u, v) => new Vector3(r * Math.cos(u), v, r * Math.sin(u)),
    { min: 0, max: TAU },
    { min: -h / 2, max: h / 2 },
    { uPeriodic: true },
  )
}

export function makeCone(halfAngle = Math.PI / 6, height = 2.4): ParametricSurface {
  const slope = Math.tan(halfAngle)
  return new ParametricSurface(
    (u, v) => new Vector3(v * slope * Math.cos(u), v, v * slope * Math.sin(u)),
    { min: 0, max: TAU },
    { min: 0.02, max: height },
    { uPeriodic: true },
  )
}

export function makeCatenoid(c = 0.6, vMax = 1.6): ParametricSurface {
  return new ParametricSurface(
    (u, v) =>
      new Vector3(c * Math.cosh(v / c) * Math.cos(u), v, c * Math.cosh(v / c) * Math.sin(u)),
    { min: 0, max: TAU },
    { min: -vMax, max: vMax },
    { uPeriodic: true },
  )
}

export function makeHelicoid(c = 0.4, turns = 1.5, vMax = 1.6): ParametricSurface {
  return new ParametricSurface(
    (u, v) => new Vector3(v * Math.cos(u), c * u, v * Math.sin(u)),
    { min: 0, max: turns * TAU },
    { min: -vMax, max: vMax },
  )
}

export function makeEnneper(radius = 1.4): ParametricSurface {
  return new ParametricSurface(
    (u, v) =>
      new Vector3(
        u - (u * u * u) / 3 + u * v * v,
        v - (v * v * v) / 3 + v * u * u,
        u * u - v * v,
      ),
    { min: -radius, max: radius },
    { min: -radius, max: radius },
  )
}

/** Tractroid: surface of revolution of constant K = −1. */
export function makePseudosphere(vMax = 3.4): ParametricSurface {
  return new ParametricSurface(
    (u, v) =>
      new Vector3(
        (1 / Math.cosh(v)) * Math.cos(u),
        v - Math.tanh(v),
        (1 / Math.cosh(v)) * Math.sin(u),
      ),
    { min: 0, max: TAU },
    { min: 0.12, max: vMax },
    { uPeriodic: true },
  )
}

export function makeMobius(R = 1.3, w = 0.5): ParametricSurface {
  return new ParametricSurface(
    (u, v) =>
      new Vector3(
        (R + v * Math.cos(u / 2)) * Math.cos(u),
        (R + v * Math.cos(u / 2)) * Math.sin(u),
        v * Math.sin(u / 2),
      ),
    { min: 0, max: TAU },
    { min: -w, max: w },
    { uPeriodic: true },
  )
}

/** Klein bagel: an immersion of the Klein bottle in R^3. */
export function makeKleinBottle(R = 1.1): ParametricSurface {
  return new ParametricSurface(
    (u, v) => {
      const r = R + Math.cos(u / 2) * Math.sin(v) - Math.sin(u / 2) * Math.sin(2 * v)
      return new Vector3(
        r * Math.cos(u),
        r * Math.sin(u),
        Math.sin(u / 2) * Math.sin(v) + Math.cos(u / 2) * Math.sin(2 * v),
      )
    },
    { min: 0, max: TAU },
    { min: 0, max: TAU },
    { uPeriodic: true, vPeriodic: true },
  )
}

export function makeEllipsoid(a = 1.8, b = 1.1, c = 0.8): ParametricSurface {
  return new ParametricSurface(
    (u, v) =>
      new Vector3(
        a * Math.sin(v) * Math.cos(u),
        c * Math.cos(v),
        b * Math.sin(v) * Math.sin(u),
      ),
    { min: 0, max: TAU },
    { min: 0.001, max: Math.PI - 0.001 },
    { uPeriodic: true },
  )
}

/** Hyperbolic paraboloid z = x^2 − y^2 (saddle). */
export function makeSaddle(size = 1.4): ParametricSurface {
  return new ParametricSurface(
    (u, v) => new Vector3(u, u * u - v * v, v),
    { min: -size, max: size },
    { min: -size, max: size },
  )
}

/** Paraboloid z = x^2 + y^2 (elliptic everywhere except vertex planar). */
export function makeParaboloid(size = 1.5): ParametricSurface {
  return new ParametricSurface(
    (u, v) => new Vector3(u, u * u + v * v, v),
    { min: -size, max: size },
    { min: -size, max: size },
  )
}

/** Monkey saddle z = x^3 − 3xy^2: three-way saddle, planar point at origin. */
export function makeMonkeySaddle(size = 1.1): ParametricSurface {
  return new ParametricSurface(
    (u, v) => new Vector3(u, u * u * u - 3 * u * v * v, v),
    { min: -size, max: size },
    { min: -size, max: size },
  )
}

/** Scherk's minimal surface (doubly periodic), z = ln(cos y / cos x). */
export function makeScherk(size = 1.35): ParametricSurface {
  const clampCos = (x: number) => Math.max(Math.cos(x), 0.05)
  return new ParametricSurface(
    (u, v) => new Vector3(u, Math.log(clampCos(v) / clampCos(u)), v),
    { min: -size, max: size },
    { min: -size, max: size },
  )
}

/** Ruled hyperboloid of one sheet: x² + z² − (a²/c²)y² = a². */
export function makeHyperboloid(a = 0.9, c = 0.7): ParametricSurface {
  return new ParametricSurface(
    (u, v) =>
      new Vector3(
        a * (Math.cos(u) - v * Math.sin(u)),
        c * v,
        a * (Math.sin(u) + v * Math.cos(u)),
      ),
    { min: 0, max: TAU },
    { min: -1.6, max: 1.6 },
    { uPeriodic: true },
  )
}

export const surfaceCatalog: SurfaceDef[] = [
  {
    id: 'sphere',
    name: 'Sphere',
    tex: String.raw`\mathbf{r}(u,v) = (R\sin v\cos u,\ R\cos v,\ R\sin v\sin u)`,
    description: 'Constant positive curvature K = 1/R². Every point is umbilic.',
    build: () => makeSphere(),
  },
  {
    id: 'torus',
    name: 'Torus',
    tex: String.raw`\mathbf{r}(u,v) = ((R + r\cos v)\cos u,\ r\sin v,\ (R + r\cos v)\sin u)`,
    description: 'K > 0 outside, K < 0 inside, K = 0 on the two polar circles.',
    build: () => makeTorus(),
  },
  {
    id: 'catenoid',
    name: 'Catenoid',
    tex: String.raw`\mathbf{r}(u,v) = (c\cosh(v/c)\cos u,\ v,\ c\cosh(v/c)\sin u)`,
    description: 'The only minimal surface of revolution (H = 0, K < 0).',
    build: () => makeCatenoid(),
  },
  {
    id: 'helicoid',
    name: 'Helicoid',
    tex: String.raw`\mathbf{r}(u,v) = (v\cos u,\ cu,\ v\sin u)`,
    description: 'The only ruled minimal surface; locally isometric to the catenoid.',
    build: () => makeHelicoid(),
  },
  {
    id: 'enneper',
    name: "Enneper's surface",
    tex: String.raw`\mathbf{r}(u,v) = (u - \tfrac{u^3}{3} + uv^2,\ v - \tfrac{v^3}{3} + vu^2,\ u^2 - v^2)`,
    description: 'A complete minimal surface with self-intersections at large radius.',
    build: () => makeEnneper(),
  },
  {
    id: 'pseudosphere',
    name: 'Pseudosphere (tractroid)',
    tex: String.raw`\mathbf{r}(u,v) = (\operatorname{sech} v\cos u,\ v - \tanh v,\ \operatorname{sech} v\sin u)`,
    description: 'Constant negative curvature K = −1; a local model of hyperbolic geometry.',
    build: () => makePseudosphere(),
  },
  {
    id: 'saddle',
    name: 'Hyperbolic paraboloid',
    tex: String.raw`z = x^2 - y^2`,
    description: 'A doubly ruled quadric with K < 0 everywhere.',
    build: () => makeSaddle(),
  },
  {
    id: 'paraboloid',
    name: 'Elliptic paraboloid',
    tex: String.raw`z = x^2 + y^2`,
    description: 'K > 0 everywhere, decaying away from the vertex.',
    build: () => makeParaboloid(),
  },
  {
    id: 'monkeysaddle',
    name: 'Monkey saddle',
    tex: String.raw`z = x^3 - 3xy^2`,
    description: 'A planar point (K = 0) at the origin with three valleys.',
    build: () => makeMonkeySaddle(),
  },
  {
    id: 'mobius',
    name: 'Möbius strip',
    tex: String.raw`\mathbf{r}(u,v) = ((R + v\cos\tfrac{u}{2})\cos u,\ (R + v\cos\tfrac{u}{2})\sin u,\ v\sin\tfrac{u}{2})`,
    description: 'The classic non-orientable surface: the normal flips after one loop.',
    build: () => makeMobius(),
  },
  {
    id: 'klein',
    name: 'Klein bottle (bagel immersion)',
    tex: String.raw`r = R + \cos\tfrac{u}{2}\sin v - \sin\tfrac{u}{2}\sin 2v`,
    description: 'A closed non-orientable surface; self-intersects in R³.',
    build: () => makeKleinBottle(),
  },
  {
    id: 'ellipsoid',
    name: 'Ellipsoid',
    tex: String.raw`\mathbf{r}(u,v) = (a\sin v\cos u,\ c\cos v,\ b\sin v\sin u)`,
    description: 'K > 0 everywhere with exactly four umbilics.',
    build: () => makeEllipsoid(),
  },
  {
    id: 'cylinder',
    name: 'Cylinder',
    tex: String.raw`\mathbf{r}(u,v) = (r\cos u,\ v,\ r\sin u)`,
    description: 'Developable: K = 0, locally isometric to the plane.',
    build: () => makeCylinder(),
  },
  {
    id: 'cone',
    name: 'Cone',
    tex: String.raw`\mathbf{r}(u,v) = (v\tan\alpha\cos u,\ v,\ v\tan\alpha\sin u)`,
    description: 'Developable away from the apex; unrolls to a sector of a disk.',
    build: () => makeCone(),
  },
  {
    id: 'scherk',
    name: "Scherk's surface",
    tex: String.raw`z = \ln\frac{\cos y}{\cos x}`,
    description: 'A doubly periodic minimal surface (one period shown).',
    build: () => makeScherk(),
  },
]
