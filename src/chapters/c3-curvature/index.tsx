import { useEffect, useMemo } from 'react'
import { useControls } from 'leva'
import { BufferAttribute, BufferGeometry, Vector3 } from 'three'
import { Line } from '@react-three/drei'
import { surfaceCatalog } from '@/math/catalog'
import type { ParametricSurface } from '@/math/surface'
import { buildSurfaceGeometry } from '@/components/ParametricSurfaceMesh'
import { Arrow } from '@/components/VectorArrow'
import type { ChapterMeta, LevaStore } from '../types'
import { useCurvatureViz, type ColorMode } from './store'
import { makeCurvatureMaterial, CLASS_IDS } from './curvatureColor'
import {
  integratePrincipalLine,
  findUmbilics,
  gaussMapSamples,
  makeBendingStrip,
} from './integrate'
import { TheorySection, Equation, Readout, P } from '@/components/TheoryPanel'
import { Badge } from '@/components/ui/badge'

export const meta: ChapterMeta = {
  id: 'curvature',
  path: '/curvature',
  title: 'Curvature Visualization',
  subtitle: 'Chapter 3',
  order: 3,
  teaser: 'Gaussian & mean curvature colormaps, principal directions, Gauss map.',
}

const BEND_ID = 'bend'
const surfaceOptions = {
  ...Object.fromEntries(
    surfaceCatalog
      .filter((d) => ['torus', 'sphere', 'ellipsoid', 'catenoid', 'helicoid', 'enneper', 'pseudosphere', 'saddle', 'monkeysaddle', 'mobius'].includes(d.id))
      .map((d) => [d.name, d.id]),
  ),
  'Bending strip (Theorema Egregium)': BEND_ID,
}

function buildSurface(id: string, alpha: number): { def: { name: string; tex: string; description: string }; surface: ParametricSurface } {
  if (id === BEND_ID) {
    return {
      def: {
        name: 'Bending strip',
        tex: String.raw`\mathbf{r}(u,v) = \left(\tfrac{\sin(\alpha u)}{\alpha},\ v,\ \tfrac{1-\cos(\alpha u)}{\alpha}\right)`,
        description:
          'A flat strip bent into a cylinder without stretching: the metric — and hence K — is preserved.',
      },
      surface: makeBendingStrip(alpha),
    }
  }
  const def = surfaceCatalog.find((d) => d.id === id) ?? surfaceCatalog[0]
  return { def, surface: def.build() }
}

const CLASS_COLORS: Record<string, string> = {
  elliptic: 'text-sky-300 border-sky-700',
  hyperbolic: 'text-orange-300 border-orange-700',
  parabolic: 'text-yellow-300 border-yellow-700',
  planar: 'text-neutral-300 border-neutral-600',
}

export function Scene({ store }: { store: LevaStore }) {
  const {
    surface: surfaceId,
    colorBy: colorByRaw,
    bendAlpha,
    resolution,
    showPrincipalField,
    showCurvatureLines,
    showUmbilics,
    showGaussMap,
    probeU,
    probeV,
  } = useControls(
    {
      surface: { value: 'torus', options: surfaceOptions },
      colorBy: { value: 'K', options: { 'Gaussian K': 'K', 'Mean H': 'H', classification: 'class', none: 'none' } },
      bendAlpha: {
        value: 0.85,
        min: 0,
        max: 1,
        step: 0.01,
        render: (get) => get('surface') === BEND_ID,
      },
      resolution: { value: 96, min: 48, max: 160, step: 8 },
      showPrincipalField: { value: false },
      showCurvatureLines: { value: true },
      showUmbilics: { value: false },
      showGaussMap: { value: false },
      probeU: { value: 0.35, min: 0.02, max: 0.98, step: 0.005 },
      probeV: { value: 0.55, min: 0.02, max: 0.98, step: 0.005 },
    },
    { store },
  )
  const colorBy = colorByRaw as ColorMode

  const { surface } = useMemo(
    () => buildSurface(surfaceId, bendAlpha),
    [surfaceId, bendAlpha],
  )

  const u = surface.uRange.min + (surface.uRange.max - surface.uRange.min) * probeU
  const v = surface.vRange.min + (surface.vRange.max - surface.vRange.min) * probeV

  const setState = useCurvatureViz((s) => s.setState)
  useEffect(() => {
    setState({ surfaceId, colorBy, u, v, bendAlpha })
  }, [surfaceId, colorBy, u, v, bendAlpha, setState])

  /** Geometry with a per-vertex curvature attribute for the shader. */
  const geometry = useMemo(() => {
    const geom: BufferGeometry = buildSurfaceGeometry(surface, resolution, resolution)
    if (colorBy === 'none') return geom
    const us = geom.getAttribute('paramU') as BufferAttribute
    const vs = geom.getAttribute('paramV') as BufferAttribute
    const count = us.count
    const curv = new Float32Array(count)
    if (colorBy === 'class') {
      for (let i = 0; i < count; i++) {
        curv[i] = CLASS_IDS[surface.classify(us.getX(i), vs.getX(i))]
      }
    } else {
      const raw = new Float32Array(count)
      let maxAbs = 1e-9
      for (let i = 0; i < count; i++) {
        const uu = us.getX(i)
        const vv = vs.getX(i)
        const val = colorBy === 'K' ? surface.gaussianCurvature(uu, vv) : surface.meanCurvature(uu, vv)
        raw[i] = val
        maxAbs = Math.max(maxAbs, Math.abs(val))
      }
      for (let i = 0; i < count; i++) curv[i] = raw[i] / maxAbs
    }
    geom.setAttribute('curvature', new BufferAttribute(curv, 1))
    return geom
  }, [surface, resolution, colorBy])
  useEffect(() => () => geometry.dispose(), [geometry])

  const material = useMemo(
    () => (colorBy === 'none' ? null : makeCurvatureMaterial(colorBy === 'class' ? 'class' : 'K')),
    [colorBy],
  )
  useEffect(() => () => material?.dispose(), [material])

  /** Principal direction field arrows (sparse). */
  const fieldArrows = useMemo(() => {
    if (!showPrincipalField) return []
    const n = 8
    const out: { origin: Vector3; d1: Vector3; d2: Vector3 }[] = []
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const uu = surface.uRange.min + ((surface.uRange.max - surface.uRange.min) * (i + 0.5)) / n
        const vv = surface.vRange.min + ((surface.vRange.max - surface.vRange.min) * (j + 0.5)) / n
        if (!surface.isRegular(uu, vv)) continue
        const { dir1, dir2 } = surface.principalDirections(uu, vv)
        out.push({ origin: surface.point(uu, vv), d1: dir1, d2: dir2 })
      }
    }
    return out
  }, [surface, showPrincipalField])

  const line1 = useMemo(
    () => (showCurvatureLines ? integratePrincipalLine(surface, u, v, 1) : []),
    [surface, u, v, showCurvatureLines],
  )
  const line2 = useMemo(
    () => (showCurvatureLines ? integratePrincipalLine(surface, u, v, 2) : []),
    [surface, u, v, showCurvatureLines],
  )

  const umbilics = useMemo(
    () => (showUmbilics ? findUmbilics(surface) : []),
    [surface, showUmbilics],
  )

  const gaussPoints = useMemo(() => {
    if (!showGaussMap) return null
    const samples = gaussMapSamples(surface)
    const positions = new Float32Array(samples.length * 3)
    samples.forEach((n, i) => {
      positions[i * 3] = n.x
      positions[i * 3 + 1] = n.y
      positions[i * 3 + 2] = n.z
    })
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(positions, 3))
    return g
  }, [surface, showGaussMap])
  useEffect(() => () => gaussPoints?.dispose(), [gaussPoints])

  const probe = surface.point(u, v)

  return (
    <>
      <mesh geometry={geometry}>
        {material ? (
          <primitive object={material} attach="material" />
        ) : (
          <meshStandardMaterial color="#7dd3fc" roughness={0.55} metalness={0.05} />
        )}
      </mesh>

      {fieldArrows.map((a, i) => (
        <group key={i}>
          <Arrow origin={a.origin} dir={a.d1} len={0.16} color="#f472b6" thickness={0.05} />
          <Arrow origin={a.origin} dir={a.d2} len={0.16} color="#e2e8f0" thickness={0.05} />
        </group>
      ))}

      {line1.length > 1 && <Line points={line1} color="#f472b6" lineWidth={2.4} />}
      {line2.length > 1 && <Line points={line2} color="#38bdf8" lineWidth={2.4} />}

      {umbilics.map((m, i) => (
        <mesh key={i} position={m.point}>
          <sphereGeometry args={[0.055, 14, 14]} />
          <meshBasicMaterial color="#f0abfc" toneMapped={false} />
        </mesh>
      ))}

      {gaussPoints && (
        <group position={[3.6, 0.2, 0]}>
          <mesh>
            <sphereGeometry args={[1, 24, 16]} />
            <meshBasicMaterial color="#334155" wireframe transparent opacity={0.35} />
          </mesh>
          <points geometry={gaussPoints}>
            <pointsMaterial color="#facc15" size={0.035} sizeAttenuation />
          </points>
        </group>
      )}

      <mesh position={probe}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color="#fafafa" toneMapped={false} />
      </mesh>
    </>
  )
}

export function Theory() {
  const { surfaceId, colorBy, u, v, bendAlpha } = useCurvatureViz()
  const { def, surface } = useMemo(
    () => buildSurface(surfaceId, bendAlpha),
    [surfaceId, bendAlpha],
  )
  const info = useMemo(() => surface.info(u, v), [surface, u, v])

  return (
    <>
      <TheorySection title={def.name}>
        <P>{def.description}</P>
        <Equation>{def.tex}</Equation>
      </TheorySection>

      <TheorySection title="At the probe">
        <Readout label="K" tex="K" value={info.K.toFixed(4)} />
        <Readout label="H" tex="H" value={info.H.toFixed(4)} />
        <Readout label="κ₁" tex="\kappa_1" value={info.k1.toFixed(4)} />
        <Readout label="κ₂" tex="\kappa_2" value={info.k2.toFixed(4)} />
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-neutral-400">classification</span>
          <Badge className={CLASS_COLORS[info.classification]}>{info.classification}</Badge>
        </div>
      </TheorySection>

      <TheorySection title="Colormap">
        {colorBy === 'K' && (
          <P>
            <span className="text-blue-400">blue: K &lt; 0</span> (saddle),{' '}
            <span className="text-neutral-200">white: K ≈ 0</span>,{' '}
            <span className="text-red-400">red: K &gt; 0</span> (dome).
          </P>
        )}
        {colorBy === 'H' && (
          <P>
            Mean curvature (sign flips with the chosen normal). Minimal
            surfaces read H ≈ 0 everywhere — try the catenoid.
          </P>
        )}
        {colorBy === 'class' && (
          <P>
            <span className="text-sky-300">sky: elliptic</span>,{' '}
            <span className="text-orange-300">orange: hyperbolic</span>,{' '}
            <span className="text-yellow-300">yellow: parabolic</span>,{' '}
            <span className="text-neutral-400">gray: planar</span>.
          </P>
        )}
        {colorBy === 'none' && <P>Plain shading; pick a colormap above.</P>}
      </TheorySection>

      <TheorySection title="Theorema Egregium">
        <Equation>{String.raw`K = \frac{LN - M^2}{EG - F^2}\ \text{depends only on } E, F, G`}</Equation>
        <P>
          Gauss’s “remarkable theorem”: K is intrinsic — it cannot change under
          bending without stretching. Select the bending strip and vary α: the
          cylinder curls up, but the K colormap never changes.
        </P>
      </TheorySection>

      <TheorySection title="Lines of curvature & Gauss map">
        <P>
          The pink/sky curves through the probe are lines of curvature —
          everywhere tangent to a principal direction. They end at umbilics.
          The Gauss map sends each point to its unit normal on the sphere;
          its area distortion is exactly |K|.
        </P>
      </TheorySection>
    </>
  )
}

export default { meta, Scene, Theory }
