import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useControls } from 'leva'
import { Group, Vector3 } from 'three'
import { surfaceCatalog, makeMobius, makeKleinBottle } from '@/math/catalog'
import { ParametricSurface } from '@/math/surface'
import { ParametricSurfaceMesh } from '@/components/ParametricSurfaceMesh'
import { Arrow, aimArrow, VectorArrow } from '@/components/VectorArrow'
import { makeBendingStrip } from '../c3-curvature/integrate'
import type { ChapterMeta, LevaStore } from '../types'
import { useGallery, type GalleryMode } from './store'
import { TheorySection, Equation, Readout, P } from '@/components/TheoryPanel'

export const meta: ChapterMeta = {
  id: 'gallery',
  path: '/gallery',
  title: 'Special Surfaces Gallery',
  subtitle: 'Chapter 6',
  order: 6,
  teaser: 'Minimal surfaces, pseudosphere, Möbius strip, Klein bottle.',
}

const TAU = Math.PI * 2

const galleryIds = ['catenoid', 'helicoid', 'enneper', 'scherk', 'pseudosphere']
const galleryOptions = Object.fromEntries(
  surfaceCatalog.filter((d) => galleryIds.includes(d.id)).map((d) => [d.name, d.id]),
)

/**
 * Associated family catenoid → helicoid: every intermediate surface is
 * minimal AND locally isometric (E = G = cosh²v, F = 0).
 */
export function makeAssociateFamily(theta: number): ParametricSurface {
  const catenoid = (u: number, v: number) =>
    new Vector3(Math.cosh(v) * Math.cos(u), v, Math.cosh(v) * Math.sin(u))
  const helicoid = (u: number, v: number) =>
    new Vector3(Math.sinh(v) * Math.sin(u), u, -Math.sinh(v) * Math.cos(u))
  return new ParametricSurface(
    (u, v) =>
      catenoid(u, v)
        .multiplyScalar(Math.cos(theta))
        .addScaledVector(helicoid(u, v), Math.sin(theta))
        .multiplyScalar(0.55),
    { min: 0, max: TAU },
    { min: -1.5, max: 1.5 },
    { uPeriodic: true },
  )
}

export function Scene({ store }: { store: LevaStore }) {
  const {
    mode: modeRaw,
    gallerySurface,
    theta,
    animateTheta,
    alpha,
    animateAlpha,
    mobiusSpeed,
    resolution,
  } = useControls(
    {
      mode: {
        value: 'gallery',
        options: {
          'Gallery': 'gallery',
          'Catenoid ↔ Helicoid': 'associate',
          'Unroll a cylinder': 'unroll',
          'Möbius normal walk': 'mobius',
          'Klein bottle': 'klein',
        },
      },
      gallerySurface: { value: 'catenoid', options: galleryOptions, render: (get) => get('mode') === 'gallery' },
      theta: { value: 0.6, min: 0, max: Math.PI / 2, step: 0.01, label: 'θ', render: (get) => get('mode') === 'associate' },
      animateTheta: { value: true, label: 'animate', render: (get) => get('mode') === 'associate' },
      alpha: { value: 1, min: 0.02, max: 1, step: 0.01, label: 'bend α', render: (get) => get('mode') === 'unroll' },
      animateAlpha: { value: false, label: 'animate', render: (get) => get('mode') === 'unroll' },
      mobiusSpeed: { value: 0.5, min: 0.1, max: 2, step: 0.05, render: (get) => get('mode') === 'mobius' },
      resolution: { value: 88, min: 48, max: 144, step: 8 },
    },
    { store },
  )
  const mode = modeRaw as GalleryMode

  const setState = useGallery((s) => s.setState)

  /* gallery */
  const galleryDef = useMemo(
    () => surfaceCatalog.find((d) => d.id === gallerySurface) ?? surfaceCatalog[0],
    [gallerySurface],
  )
  const galleryObj = useMemo(() => galleryDef.build(), [galleryDef])
  const galleryMeanH = useMemo(() => {
    // average |H| over a small grid — the minimal-surface certificate
    const n = 16
    let sum = 0
    let count = 0
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const u = galleryObj.uRange.min + ((galleryObj.uRange.max - galleryObj.uRange.min) * (i + 0.5)) / n
        const v = galleryObj.vRange.min + ((galleryObj.vRange.max - galleryObj.vRange.min) * (j + 0.5)) / n
        if (!galleryObj.isRegular(u, v)) continue
        sum += Math.abs(galleryObj.meanCurvature(u, v))
        count++
      }
    }
    return count ? sum / count : null
  }, [galleryObj])

  /* associate family */
  const thetaRef = useRef(theta)
  thetaRef.current = animateTheta ? thetaRef.current : theta
  const associateSurface = useMemo(
    () => makeAssociateFamily(thetaRef.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, Math.round(thetaRef.current * 50)],
  )
  const associateFF = useMemo(
    () => associateSurface.firstForm(1.1, 0.6),
    [associateSurface],
  )

  /* unroll */
  const alphaRef = useRef(alpha)
  alphaRef.current = animateAlpha ? alphaRef.current : alpha
  const unrollSurface = useMemo(
    () => makeBendingStrip(alphaRef.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, Math.round(alphaRef.current * 50)],
  )
  const unrollArea = useMemo(() => unrollSurface.area(40, 24), [unrollSurface])

  /* mobius */
  const mobius = useMemo(() => makeMobius(), [])
  const klein = useMemo(() => makeKleinBottle(), [])
  const uRef = useRef(0)
  const markerRef = useRef<Group>(null)
  const normalArrowRef = useRef<Group>(null)
  const mobiusFan = useMemo(() => {
    const n = 26
    return Array.from({ length: n }, (_, i) => {
      const u = (TAU * i) / n
      return { u, origin: mobius.point(u, 0), dir: mobius.normal(u, 0) }
    })
  }, [mobius])

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    if (mode === 'associate' && animateTheta) {
      thetaRef.current = (thetaRef.current + dt * 0.25) % (Math.PI / 2)
    }
    if (mode === 'unroll' && animateAlpha) {
      alphaRef.current = 1 - ((1 + Math.sin(Date.now() / 1600)) / 2) * 0.98
    }
    if (mode === 'mobius') {
      uRef.current += dt * mobiusSpeed * 0.9
      const u = uRef.current % (2 * TAU)
      const p = mobius.point(u % TAU, 0)
      const n = mobius.normal(u % TAU, 0)
      if (markerRef.current) markerRef.current.position.copy(p)
      aimArrow(normalArrowRef.current, n, 0.5)
      if (normalArrowRef.current) normalArrowRef.current.position.copy(p)
      const loops = Math.floor(u / TAU)
      const flipped = u % TAU > 0 && n.dot(mobius.normal(0, 0)) < 0
      setState({ mobiusLoops: loops, normalFlipped: loops === 0 ? flipped : u >= TAU })
    }
  })

  useEffect(() => {
    setState({
      mode,
      surfaceId: gallerySurface,
      meanH: galleryMeanH,
      theta: thetaRef.current,
      firstForm: associateFF,
      alpha: alphaRef.current,
      area: unrollArea,
    })
  }, [mode, gallerySurface, galleryMeanH, associateFF, unrollArea, setState])

  return (
    <>
      {mode === 'gallery' && (
        <ParametricSurfaceMesh surface={galleryObj} segU={resolution} segV={resolution} />
      )}
      {mode === 'associate' && (
        <ParametricSurfaceMesh surface={associateSurface} segU={resolution} segV={resolution} color="#86efac" />
      )}
      {mode === 'unroll' && (
        <ParametricSurfaceMesh surface={unrollSurface} segU={resolution} segV={Math.round(resolution / 2)} color="#fbbf24" />
      )}
      {mode === 'mobius' && (
        <>
          <ParametricSurfaceMesh surface={mobius} segU={resolution} segV={28} opacity={0.9} />
          {mobiusFan.map((f, i) => (
            <Arrow key={i} origin={f.origin} dir={f.dir} len={0.22} color="#c4b5fd" thickness={0.045} />
          ))}
          <group ref={markerRef}>
            <mesh>
              <sphereGeometry args={[0.06, 16, 16]} />
              <meshBasicMaterial color="#fafafa" toneMapped={false} />
            </mesh>
          </group>
          <VectorArrow ref={normalArrowRef} color="#fb7185" thickness={0.05} />
        </>
      )}
      {mode === 'klein' && (
        <ParametricSurfaceMesh surface={klein} segU={resolution} segV={resolution} opacity={0.82} color="#67e8f9" />
      )}
    </>
  )
}

export function Theory() {
  const { mode, surfaceId, meanH, firstForm, alpha, area, mobiusLoops, normalFlipped } =
    useGallery()
  const def = surfaceCatalog.find((d) => d.id === surfaceId)

  return (
    <>
      {mode === 'gallery' && def && (
        <>
          <TheorySection title={def.name}>
            <P>{def.description}</P>
            <Equation>{def.tex}</Equation>
          </TheorySection>
          {meanH !== null && (
            <TheorySection title="Minimal-surface certificate">
              <Readout label="mean |H| over surface" tex="\overline{|H|}" value={meanH.toExponential(2)} />
              <P>
                Numerically zero (up to finite-difference noise) — the surface
                is a critical point of the area functional.
              </P>
            </TheorySection>
          )}
        </>
      )}

      {mode === 'associate' && (
        <>
          <TheorySection title="Catenoid ↔ Helicoid">
            <Equation>{String.raw`\mathbf{r}_\theta = \cos\theta\;\mathbf{r}_{\text{cat}} + \sin\theta\;\mathbf{r}_{\text{hel}}`}</Equation>
            <P>
              Conjugate minimal surfaces: every intermediate θ is minimal, and
              all share the same first fundamental form — the deformation is an
              isometry. Watch E, F, G: they do not change as θ animates.
            </P>
          </TheorySection>
          {firstForm && (
            <TheorySection title="First fundamental form (fixed sample point)">
              <Readout label="E" tex="E" value={firstForm.E.toFixed(5)} />
              <Readout label="F" tex="F" value={firstForm.F.toFixed(5)} />
              <Readout label="G" tex="G" value={firstForm.G.toFixed(5)} />
            </TheorySection>
          )}
        </>
      )}

      {mode === 'unroll' && (
        <>
          <TheorySection title="Unrolling a developable surface">
            <P>
              The cylinder has K = 0, so it can be unrolled onto the plane
              without stretching — arc lengths, angles and areas are preserved.
              Slide α from 1 (cylinder) to 0 (flat strip).
            </P>
            <Equation>{String.raw`K = 0 \;\Longrightarrow\; \text{locally isometric to } \mathbb{R}^2`}</Equation>
          </TheorySection>
          <TheorySection title="Area under the deformation">
            <Readout label="bend parameter" tex="\alpha" value={alpha.toFixed(3)} />
            {area !== null && (
              <Readout label="total area" tex="\int dA" value={area.toFixed(4)} />
            )}
            <P>Area (and the metric) stays constant while the shape changes.</P>
          </TheorySection>
        </>
      )}

      {mode === 'mobius' && (
        <>
          <TheorySection title="Non-orientability, live">
            <Equation>{String.raw`\mathbf{n}(u + 2\pi, 0) = -\,\mathbf{n}(u, 0)`}</Equation>
            <P>
              The pink normal travels around the centerline. After one loop it
              points the opposite way — no continuous unit normal field exists
              on a Möbius strip. After two loops it agrees with itself.
            </P>
          </TheorySection>
          <TheorySection title="Walk status">
            <Readout label="completed loops" tex="\ell" value={String(mobiusLoops)} />
            <Readout
              label="normal vs start"
              tex="\mathbf{n}\cdot\mathbf{n}_0"
              value={normalFlipped ? 'flipped (−1)' : 'aligned (+1)'}
            />
          </TheorySection>
        </>
      )}

      {mode === 'klein' && (
        <>
          <TheorySection title="Klein bottle">
            <P>
              A closed non-orientable surface (χ = 0). Every immersion in R³
              must self-intersect — the “neck” passes through the body. An
              embedding exists only in R⁴.
            </P>
            <Equation>{String.raw`\chi = 0,\quad \text{non-orientable}`}</Equation>
          </TheorySection>
        </>
      )}
    </>
  )
}

export default { meta, Scene, Theory }
