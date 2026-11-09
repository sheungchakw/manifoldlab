import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { useControls } from 'leva'
import { Curve, Group, Matrix4, Mesh, TubeGeometry, Vector3 } from 'three'
import { curveCatalog } from '@/math/catalog'
import type { ParametricCurve, FrenetFrame } from '@/math/curve'
import { rangeSpan } from '@/math/types'
import { VectorArrow, aimArrow } from '@/components/VectorArrow'
import type { ChapterMeta, LevaStore } from '../types'
import { useCurveViz } from './store'
import { CurvaturePlot } from './CurvaturePlot'
import { TheorySection, Equation, Readout, P } from '@/components/TheoryPanel'
import { TeX } from '@/components/TeX'

export const meta: ChapterMeta = {
  id: 'curves',
  path: '/curves',
  title: 'Curves & Frenet–Serret',
  subtitle: 'Chapter 1',
  order: 1,
  teaser: 'TNB frames, curvature κ and torsion τ, osculating circles, knots.',
}

/** Adapt a ParametricCurve to three.js' Curve interface (for TubeGeometry). */
class FnCurve extends Curve<Vector3> {
  c: ParametricCurve
  constructor(c: ParametricCurve) {
    super()
    this.c = c
  }
  override getPoint(t: number, target = new Vector3()): Vector3 {
    const { min } = this.c.range
    return target.copy(this.c.point(min + t * rangeSpan(this.c.range)))
  }
}

const T_COLOR = '#38bdf8'
const N_COLOR = '#fb7185'
const B_COLOR = '#4ade80'

const curveOptions = Object.fromEntries(curveCatalog.map((d) => [d.name, d.id]))

/** Unit circle in the XY plane (for the osculating circle, scaled by 1/κ). */
const UNIT_CIRCLE = Array.from({ length: 65 }, (_, i) => {
  const a = (i / 64) * Math.PI * 2
  return new Vector3(Math.cos(a), Math.sin(a), 0)
})

export function Scene({ store }: { store: LevaStore }) {
  const {
    curve: curveId,
    playing,
    speed,
    parametrization,
    showTube,
    tubeRadius,
    showFrame,
    showOsculatingCircle,
    showOsculatingPlane,
    frameScale,
  } = useControls(
    {
      curve: { value: 'helix', options: curveOptions },
      playing: { value: true },
      speed: { value: 1, min: 0.1, max: 3, step: 0.05 },
      parametrization: { value: 'arc length', options: ['arc length', 'natural'] },
      showTube: { value: true },
      tubeRadius: { value: 0.08, min: 0.02, max: 0.2, step: 0.01 },
      showFrame: { value: true },
      showOsculatingCircle: { value: false },
      showOsculatingPlane: { value: false },
      frameScale: { value: 1, min: 0.4, max: 2, step: 0.05 },
    },
    { store },
  )

  const data = useMemo(() => {
    const def = curveCatalog.find((d) => d.id === curveId) ?? curveCatalog[0]
    const curve = def.build()
    const n = 512
    const span = rangeSpan(curve.range)
    const pts = Array.from({ length: n + 1 }, (_, i) =>
      curve.point(curve.range.min + (span * i) / n),
    )
    const table = curve.arcLengthTable(2048)
    const plotN = 240
    const ts: number[] = []
    const kappas: number[] = []
    const taus: number[] = []
    let kMax = 1e-6
    let tauMax = 1e-6
    for (let i = 0; i <= plotN; i++) {
      const t = curve.range.min + (span * i) / plotN
      const k = curve.curvature(t)
      const tau = curve.torsion(t)
      ts.push(t)
      kappas.push(k)
      taus.push(tau)
      kMax = Math.max(kMax, k)
      tauMax = Math.max(tauMax, Math.abs(tau))
    }
    const totalCurvature = curve.totalCurvature(1024)
    const rmf = curve.rotationMinimizingFrames(360)
    const fnCurve = new FnCurve(curve)
    return {
      def,
      curve,
      pts,
      table,
      plot: { ts, kappas, taus, kMax, tauMax },
      totalCurvature,
      rmf,
      fnCurve,
    }
  }, [curveId])

  const setCurveInfo = useCurveViz((s) => s.setCurveInfo)
  const setLive = useCurveViz((s) => s.setLive)

  useEffect(() => {
    setCurveInfo({
      curveId,
      closed: data.curve.closed,
      arcLength: data.table.total,
      totalCurvature: data.totalCurvature,
      plot: data.plot,
    })
    tRef.current = 0
    sRef.current = 0
  }, [data, curveId, setCurveInfo])

  const tubeGeom = useMemo(
    () => new TubeGeometry(data.fnCurve, 420, tubeRadius, 18, data.curve.closed),
    [data, tubeRadius],
  )
  useEffect(() => () => tubeGeom.dispose(), [tubeGeom])

  /** Frenet frame with RMF fallback so the frame never flips at inflections. */
  const frameAt = (t: number): FrenetFrame => {
    const frenet = data.curve.frenetFrame(t)
    if (frenet) return frenet
    const span = rangeSpan(data.curve.range)
    const idx = Math.round(((t - data.curve.range.min) / span) * 360)
    return data.rmf[Math.min(Math.max(idx, 0), 360)].frame
  }

  const tRef = useRef(0)
  const sRef = useRef(0)
  const prevMode = useRef(parametrization)
  const groupRef = useRef<Group>(null)
  const tArrow = useRef<Group>(null)
  const nArrow = useRef<Group>(null)
  const bArrow = useRef<Group>(null)
  const circleRef = useRef<Group>(null)
  const planeRef = useRef<Mesh>(null)

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 0.05)
    const curve = data.curve
    const span = rangeSpan(curve.range)

    // Keep arc-length position in sync when toggling parametrization mode
    if (prevMode.current !== parametrization) {
      prevMode.current = parametrization
      if (parametrization === 'arc length') {
        const ts = data.table.ts
        let idx = ts.findIndex((x) => x >= tRef.current)
        if (idx < 0) idx = ts.length - 1
        sRef.current = data.table.ss[idx]
      }
    }

    if (playing) {
      if (parametrization === 'arc length') {
        sRef.current += dt * speed * 1.1
        const s = sRef.current % data.table.total
        tRef.current = curve.parameterAtArcLength(s, data.table)
      } else {
        tRef.current += (dt * speed * span) / 14
        const wrapped = curve.range.min + ((tRef.current - curve.range.min) % span)
        tRef.current = wrapped < curve.range.min ? wrapped + span : wrapped
      }
    }

    const t = tRef.current
    const p = curve.point(t)
    const frame = frameAt(t)
    const kappa = curve.curvature(t)
    const tau = curve.torsion(t)
    const spd = curve.speed(t)

    if (groupRef.current) groupRef.current.position.copy(p)
    aimArrow(tArrow.current, frame.T, 0.85 * frameScale)
    aimArrow(nArrow.current, frame.N, 0.7 * frameScale)
    aimArrow(bArrow.current, frame.B, 0.7 * frameScale)

    const osc = showOsculatingCircle ? curve.osculatingCircle(t) : null
    if (circleRef.current) {
      circleRef.current.visible = !!osc
      if (osc) {
        circleRef.current.position.copy(osc.center)
        circleRef.current.scale.setScalar(osc.radius)
        const m = new Matrix4().makeBasis(frame.T, frame.N, frame.B)
        circleRef.current.quaternion.setFromRotationMatrix(m)
      }
    }
    if (planeRef.current) {
      planeRef.current.visible = showOsculatingPlane
      if (showOsculatingPlane) {
        planeRef.current.position.copy(p)
        planeRef.current.quaternion.setFromUnitVectors(
          new Vector3(0, 0, 1),
          frame.B,
        )
      }
    }

    setLive({ t, kappa, tau, speed: spd })
  })

  return (
    <>
      <mesh geometry={tubeGeom} visible={showTube}>
        <meshStandardMaterial
          color="#7dd3fc"
          transparent
          opacity={0.25}
          roughness={0.4}
          depthWrite={false}
        />
      </mesh>
      <Line points={data.pts} color="#e0f2fe" lineWidth={2} />
      <group ref={groupRef}>
        {/* moving point marker */}
        <mesh>
          <sphereGeometry args={[0.055, 16, 16]} />
          <meshBasicMaterial color="#fafafa" toneMapped={false} />
        </mesh>
        <group visible={showFrame}>
          <VectorArrow ref={tArrow} color={T_COLOR} />
          <VectorArrow ref={nArrow} color={N_COLOR} />
          <VectorArrow ref={bArrow} color={B_COLOR} />
        </group>
      </group>
      <group ref={circleRef} visible={false}>
        <Line points={UNIT_CIRCLE} color="#f472b6" lineWidth={1.6} />
      </group>
      <mesh ref={planeRef} visible={false}>
        <planeGeometry args={[2.2, 2.2]} />
        <meshBasicMaterial
          color="#a78bfa"
          transparent
          opacity={0.16}
          side={2}
          depthWrite={false}
        />
      </mesh>
    </>
  )
}

export function Theory() {
  const { curveId, t, kappa, tau, speed, arcLength, totalCurvature, closed, plot } =
    useCurveViz()
  const def = curveCatalog.find((d) => d.id === curveId) ?? curveCatalog[0]
  const isKnot = closed && totalCurvature > 4 * Math.PI - 0.1

  return (
    <>
      <TheorySection title={def.name}>
        <P>{def.description}</P>
        <Equation>{def.tex}</Equation>
      </TheorySection>

      <TheorySection title="Live values">
        <Readout label="t" tex="t" value={t.toFixed(3)} />
        <Readout label="κ" tex="\kappa(t)" value={kappa.toFixed(4)} />
        <Readout label="τ" tex="\tau(t)" value={tau.toFixed(4)} />
        <Readout label="speed" tex="|\gamma'(t)|" value={speed.toFixed(3)} />
        <div className="mt-2 flex gap-3 text-xs">
          <span style={{ color: T_COLOR }}>— T tangent</span>
          <span style={{ color: N_COLOR }}>— N normal</span>
          <span style={{ color: B_COLOR }}>— B binormal</span>
        </div>
      </TheorySection>

      <TheorySection title="κ and τ over the whole curve">
        {plot && <CurvaturePlot plot={plot} currentT={t} />}
      </TheorySection>

      <TheorySection title="Integral invariants">
        <Readout
          label="total curvature"
          tex="\int \kappa\,ds"
          value={totalCurvature.toFixed(3)}
        />
        <Readout label="arc length" tex="L" value={arcLength.toFixed(3)} />
        {closed && (
          <P>
            Fenchel’s theorem: a closed curve has ∫κ ds ≥ 2π ≈{' '}
            {(2 * Math.PI).toFixed(3)}.
            {isKnot &&
              ` By Fary–Milnor, this nontrivial knot exceeds 4π ≈ ${(4 * Math.PI).toFixed(3)}.`}
          </P>
        )}
      </TheorySection>

      <TheorySection title="Frenet–Serret equations">
        <Equation>{String.raw`\begin{pmatrix} T' \\ N' \\ B' \end{pmatrix} = \begin{pmatrix} 0 & \kappa & 0 \\ -\kappa & 0 & \tau \\ 0 & -\tau & 0 \end{pmatrix} \begin{pmatrix} T \\ N \\ B \end{pmatrix}`}</Equation>
        <P>
          Curvature measures the turning of <TeX>{String.raw`T`}</TeX> in the
          osculating plane; torsion measures how the curve twists out of it.
        </P>
      </TheorySection>
    </>
  )
}

export default { meta, Scene, Theory }
