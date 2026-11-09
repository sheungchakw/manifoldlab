import { useEffect, useMemo } from 'react'
import { useControls } from 'leva'
import { Quaternion, Vector3 } from 'three'
import { surfaceCatalog } from '@/math/catalog'
import { ParametricSurfaceMesh } from '@/components/ParametricSurfaceMesh'
import { Arrow } from '@/components/VectorArrow'
import type { ChapterMeta, LevaStore } from '../types'
import { useSurfaceProbe } from './store'
import { TheorySection, Equation, Readout, P } from '@/components/TheoryPanel'
import { Badge } from '@/components/ui/badge'

export const meta: ChapterMeta = {
  id: 'surfaces',
  path: '/surfaces',
  title: 'Surfaces & Fundamental Forms',
  subtitle: 'Chapter 2',
  order: 2,
  teaser: 'First and second fundamental forms, tangent planes, surface zoo.',
}

const surfaceOptions = Object.fromEntries(surfaceCatalog.map((d) => [d.name, d.id]))

const CLASS_COLORS: Record<string, string> = {
  elliptic: 'text-sky-300 border-sky-700',
  hyperbolic: 'text-orange-300 border-orange-700',
  parabolic: 'text-yellow-300 border-yellow-700',
  planar: 'text-neutral-300 border-neutral-600',
}

function buildSurface(id: string) {
  const def = surfaceCatalog.find((d) => d.id === id) ?? surfaceCatalog[0]
  return { def, surface: def.build() }
}

export function Scene({ store }: { store: LevaStore }) {
  const {
    surface: surfaceId,
    resolution,
    wireframe,
    showNormalField,
    showTangentPlane,
    probeU,
    probeV,
  } = useControls(
    {
      surface: { value: 'torus', options: surfaceOptions },
      resolution: { value: 80, min: 24, max: 160, step: 4 },
      wireframe: { value: false },
      showNormalField: { value: false },
      showTangentPlane: { value: true },
      probeU: { value: 0.35, min: 0, max: 1, step: 0.002 },
      probeV: { value: 0.55, min: 0, max: 1, step: 0.002 },
    },
    { store },
  )

  const { surface } = useMemo(() => buildSurface(surfaceId), [surfaceId])

  const u = surface.uRange.min + (surface.uRange.max - surface.uRange.min) * probeU
  const v = surface.vRange.min + (surface.vRange.max - surface.vRange.min) * probeV
  const info = useMemo(() => surface.info(u, v), [surface, u, v])

  const setProbe = useSurfaceProbe((s) => s.setProbe)
  useEffect(() => {
    setProbe({ surfaceId, u, v })
  }, [surfaceId, u, v, setProbe])

  /** Sparse field of unit normal arrows (independent of the probe). */
  const normalField = useMemo(() => {
    if (!showNormalField) return null
    const n = 9
    const arrows: { origin: Vector3; dir: Vector3 }[] = []
    for (let i = 0; i <= n; i++) {
      for (let j = 0; j <= n; j++) {
        const uu =
          surface.uRange.min +
          ((surface.uRange.max - surface.uRange.min) * (i + 0.5)) / (n + 1)
        const vv =
          surface.vRange.min +
          ((surface.vRange.max - surface.vRange.min) * (j + 0.5)) / (n + 1)
        const dir = surface.normal(uu, vv)
        if (dir.lengthSq() < 1e-9) continue
        arrows.push({ origin: surface.point(uu, vv), dir })
      }
    }
    return arrows
  }, [surface, showNormalField])

  const tangentLen = 0.55
  const ruDir = useMemo(() => info.ru.clone().normalize(), [info])
  const rvDir = useMemo(() => info.rv.clone().normalize(), [info])
  const tangentQuat = useMemo(
    () =>
      new Quaternion().setFromUnitVectors(
        new Vector3(0, 0, 1),
        info.normal.clone().normalize(),
      ),
    [info],
  )

  return (
    <>
      <ParametricSurfaceMesh
        surface={surface}
        segU={resolution}
        segV={resolution}
        wireframe={wireframe}
        opacity={wireframe ? 0.85 : 1}
      />
      {normalField?.map((a, i) => (
        <Arrow key={i} origin={a.origin} dir={a.dir} len={0.22} color="#a5f3fc" thickness={0.05} />
      ))}
      {/* probe */}
      <group position={info.point}>
        <mesh>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshBasicMaterial color="#fafafa" toneMapped={false} />
        </mesh>
      </group>
      <Arrow origin={info.point} dir={ruDir} len={tangentLen} color="#38bdf8" />
      <Arrow origin={info.point} dir={rvDir} len={tangentLen} color="#fb923c" />
      <Arrow origin={info.point} dir={info.normal} len={0.7} color="#f5f5f5" />
      {showTangentPlane && (
        <mesh position={info.point} quaternion={tangentQuat}>
          <planeGeometry args={[1.5, 1.5]} />
          <meshBasicMaterial color="#a78bfa" transparent opacity={0.14} side={2} depthWrite={false} />
        </mesh>
      )}
    </>
  )
}

export function Theory() {
  const { surfaceId, u, v } = useSurfaceProbe()
  const { def, surface } = useMemo(() => buildSurface(surfaceId), [surfaceId])
  const info = useMemo(() => surface.info(u, v), [surface, u, v])
  const { E, F, G } = info.first
  const { L, M, N } = info.second
  const detI = E * G - F * F

  return (
    <>
      <TheorySection title={def.name}>
        <P>{def.description}</P>
        <Equation>{def.tex}</Equation>
      </TheorySection>

      <TheorySection title="Probe">
        <Readout label="u" tex="u" value={u.toFixed(3)} />
        <Readout label="v" tex="v" value={v.toFixed(3)} />
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs text-neutral-400">point type</span>
          <Badge className={CLASS_COLORS[info.classification]}>
            {info.classification}
          </Badge>
          {info.umbilic && <Badge className="text-pink-300 border-pink-700">umbilic</Badge>}
        </div>
      </TheorySection>

      <TheorySection title="First fundamental form">
        <Readout label="E" tex="E=\langle r_u, r_u\rangle" value={E.toFixed(4)} />
        <Readout label="F" tex="F=\langle r_u, r_v\rangle" value={F.toFixed(4)} />
        <Readout label="G" tex="G=\langle r_v, r_v\rangle" value={G.toFixed(4)} />
        <Readout
          label="area element"
          tex="\sqrt{EG-F^2}"
          value={Math.sqrt(Math.max(detI, 0)).toFixed(4)}
        />
      </TheorySection>

      <TheorySection title="Second fundamental form">
        <Readout label="L" tex="L=\langle r_{uu}, n\rangle" value={L.toFixed(4)} />
        <Readout label="M" tex="M=\langle r_{uv}, n\rangle" value={M.toFixed(4)} />
        <Readout label="N" tex="N=\langle r_{vv}, n\rangle" value={N.toFixed(4)} />
      </TheorySection>

      <TheorySection title="Curvatures at probe">
        <Readout label="K" tex="K=\dfrac{LN-M^2}{EG-F^2}" value={info.K.toFixed(4)} />
        <Readout label="H" tex="H=\dfrac{EN-2FM+GL}{2(EG-F^2)}" value={info.H.toFixed(4)} />
        <Readout label="κ₁" tex="\kappa_1" value={info.k1.toFixed(4)} />
        <Readout label="κ₂" tex="\kappa_2" value={info.k2.toFixed(4)} />
      </TheorySection>

      <TheorySection title="Reading the forms">
        <P>
          I measures lengths and angles intrinsically; II measures how the
          surface bends in space. Their ratio (the shape operator) has the
          principal curvatures as eigenvalues.
        </P>
      </TheorySection>
    </>
  )
}

export default { meta, Scene, Theory }
