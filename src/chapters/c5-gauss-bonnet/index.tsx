import { useEffect, useMemo, useRef, useState } from 'react'
import { useControls } from 'leva'
import { BufferAttribute, BufferGeometry, Vector3 } from 'three'
import { Line, Html } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { ParametricSurfaceMesh } from '@/components/ParametricSurfaceMesh'
import { makeTorus, makeEllipsoid, makeSphere } from '@/math/catalog'
import type { ChapterMeta, LevaStore } from '../types'
import { useGaussBonnet } from './store'
import {
  greatCircleArc,
  sphericalAngle,
  sphericalExcess,
  buildSphericalPatch,
  tangentAngleArc,
} from './spherical'
import { TheorySection, Equation, Readout, P } from '@/components/TheoryPanel'

export const meta: ChapterMeta = {
  id: 'gauss-bonnet',
  path: '/gauss-bonnet',
  title: 'Gauss–Bonnet & Global Theorems',
  subtitle: 'Chapter 5',
  order: 5,
  teaser: 'Watch ∫K dA + boundary terms land exactly on 2πχ, interactively.',
}

const R = 1.5 // visual sphere radius (math is done on unit directions)

function unitFromUV(u: number, v: number): Vector3 {
  return new Vector3(Math.sin(v) * Math.cos(u), Math.cos(v), Math.sin(v) * Math.sin(u))
}

function uvFromUnit(p: Vector3): { u: number; v: number } {
  return { u: Math.atan2(p.z, p.x), v: Math.acos(Math.min(Math.max(p.y, -1), 1)) }
}

const TAU = Math.PI * 2

export function Scene({ store }: { store: LevaStore }) {
  const [values, set] = useControls(
    () => ({
      mode: { value: 'triangle', options: { 'Geodesic triangle': 'triangle', 'Total curvature ∬K dA': 'total' } },
      Au: { value: 0.05, min: 0, max: 1, step: 0.005, label: 'A longitude' },
      Av: { value: 0.22, min: 0.04, max: 0.96, step: 0.005, label: 'A latitude' },
      Bu: { value: 0.38, min: 0, max: 1, step: 0.005, label: 'B longitude' },
      Bv: { value: 0.5, min: 0.04, max: 0.96, step: 0.005, label: 'B latitude' },
      Cu: { value: 0.72, min: 0, max: 1, step: 0.005, label: 'C longitude' },
      Cv: { value: 0.18, min: 0.04, max: 0.96, step: 0.005, label: 'C latitude' },
      showPatch: { value: true, render: (get) => get('mode') === 'triangle' },
      showLabels: { value: true, render: (get) => get('mode') === 'triangle' },
      totalSurface: { value: 'torus', options: ['sphere', 'torus', 'ellipsoid'], render: (get) => get('mode') === 'total' },
      gridN: { value: 96, min: 48, max: 160, step: 8, render: (get) => get('mode') === 'total' },
    }),
    { store },
  )
  const mode = values.mode as 'triangle' | 'total'

  const setGB = useGaussBonnet((s) => s.setState)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const dragRef = useRef<number | null>(null)

  /* ------------------------- triangle mode ------------------------- */
  const verts = useMemo(() => {
    const A = unitFromUV(values.Au * TAU, 0.12 + values.Av * (Math.PI - 0.24))
    const B = unitFromUV(values.Bu * TAU, 0.12 + values.Bv * (Math.PI - 0.24))
    const C = unitFromUV(values.Cu * TAU, 0.12 + values.Cv * (Math.PI - 0.24))
    return [A, B, C]
  }, [values.Au, values.Av, values.Bu, values.Bv, values.Cu, values.Cv])

  const tri = useMemo(() => {
    const [A, B, C] = verts
    const angles = [
      sphericalAngle(A, B, C),
      sphericalAngle(B, C, A),
      sphericalAngle(C, A, B),
    ]
    const sum = angles[0] + angles[1] + angles[2]
    const excess = sum - Math.PI
    const areaNumeric = sphericalExcess(A, B, C) * R * R
    const intKdA = areaNumeric / (R * R) // K = 1/R^2
    const arcs = [
      greatCircleArc(A, B).map((p) => p.clone().multiplyScalar(R)),
      greatCircleArc(B, C).map((p) => p.clone().multiplyScalar(R)),
      greatCircleArc(C, A).map((p) => p.clone().multiplyScalar(R)),
    ]
    const angleArcs = [
      tangentAngleArc(A, B, C).map((p) => p.clone().multiplyScalar(R)),
      tangentAngleArc(B, C, A).map((p) => p.clone().multiplyScalar(R)),
      tangentAngleArc(C, A, B).map((p) => p.clone().multiplyScalar(R)),
    ]
    const patch = buildSphericalPatch(A, B, C)
    return { angles, sum, excess, areaNumeric, intKdA, arcs, angleArcs, patch }
  }, [verts])

  const patchGeom = useMemo(() => {
    const g = new BufferGeometry()
    const scaled = new Float32Array(tri.patch.positions.length)
    for (let i = 0; i < tri.patch.positions.length; i++) scaled[i] = tri.patch.positions[i] * R
    g.setAttribute('position', new BufferAttribute(scaled, 3))
    g.setIndex(new BufferAttribute(tri.patch.indices, 1))
    g.computeVertexNormals()
    return g
  }, [tri])
  useEffect(() => () => patchGeom.dispose(), [patchGeom])

  /* -------------------------- total mode --------------------------- */
  const totalSurface = useMemo(() => {
    if (values.totalSurface === 'sphere') return makeSphere()
    if (values.totalSurface === 'ellipsoid') return makeEllipsoid()
    return makeTorus()
  }, [values.totalSurface])

  const totalStats = useMemo(() => {
    if (mode !== 'total') return null
    const n = values.gridN
    const intK = totalSurface.totalGaussianCurvature(n, n)
    const willmore = totalSurface.willmoreEnergy(Math.min(n, 96), Math.min(n, 96))
    const isTorus = values.totalSurface === 'torus'
    return {
      intK,
      willmore,
      expected: isTorus ? 0 : 4 * Math.PI,
      chiLabel: isTorus ? 'χ = 0' : 'χ = 2',
    }
  }, [mode, totalSurface, values.totalSurface, values.gridN])

  useEffect(() => {
    if (mode === 'triangle') {
      setGB({
        mode,
        anglesDeg: tri.angles.map((a) => (a * 180) / Math.PI) as [number, number, number],
        angleSumDeg: (tri.sum * 180) / Math.PI,
        excess: tri.excess,
        areaNumeric: tri.areaNumeric,
        intKdA: tri.intKdA,
        expected: null,
        chiLabel: '',
        willmore: null,
      })
    } else if (totalStats) {
      setGB({
        mode,
        intKdA: totalStats.intK,
        expected: totalStats.expected,
        chiLabel: totalStats.chiLabel,
        willmore: totalStats.willmore,
      })
    }
  }, [mode, tri, totalStats, setGB])

  /* ------------------------ pointer dragging ----------------------- */
  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (mode !== 'triangle') return
    const p = e.point.clone().normalize()
    let best = 0
    let bestD = Infinity
    verts.forEach((vtx, i) => {
      const d = vtx.distanceTo(p)
      if (d < bestD) {
        bestD = d
        best = i
      }
    })
    dragRef.current = best
    setDragIdx(best)
    ;(e.target as Element).setPointerCapture?.(e.pointerId)
  }
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (dragRef.current === null || mode !== 'triangle') return
    const p = e.point.clone().normalize()
    const { u, v } = uvFromUnit(p)
    const u01 = ((u % TAU) + TAU) % TAU / TAU
    const v01 = (v - 0.12) / (Math.PI - 0.24)
    const names = ['A', 'B', 'C'] as const
    const name = names[dragRef.current]
    set({ [`${name}u`]: u01, [`${name}v`]: Math.min(Math.max(v01, 0.04), 0.96) })
  }
  const onUp = () => {
    dragRef.current = null
    setDragIdx(null)
  }

  return (
    <>
      {mode === 'triangle' ? (
        <>
          <mesh onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
            <sphereGeometry args={[R, 72, 48]} />
            <meshStandardMaterial color="#64748b" transparent opacity={0.35} roughness={0.8} />
          </mesh>
          {values.showPatch && (
            <mesh geometry={patchGeom}>
              <meshStandardMaterial color="#f59e0b" transparent opacity={0.5} side={2} />
            </mesh>
          )}
          {tri.arcs.map((pts, i) => (
            <Line key={i} points={pts} color="#fbbf24" lineWidth={3} />
          ))}
          {tri.angleArcs.map((pts, i) => (
            <Line key={i} points={pts} color="#f472b6" lineWidth={2} />
          ))}
          {verts.map((vtx, i) => (
            <mesh key={i} position={vtx.clone().multiplyScalar(R)}>
              <sphereGeometry args={[dragIdx === i ? 0.075 : 0.055, 16, 16]} />
              <meshBasicMaterial color={['#38bdf8', '#4ade80', '#fb7185'][i]} toneMapped={false} />
            </mesh>
          ))}
          {values.showLabels &&
            verts.map((vtx, i) => (
              <Html key={i} position={vtx.clone().multiplyScalar(R * 1.13)} center>
                <div className="rounded bg-neutral-950/85 px-2 py-0.5 text-xs text-neutral-100 border border-neutral-700">
                  {`${'ABC'[i]}: ${((tri.angles[i] * 180) / Math.PI).toFixed(1)}°`}
                </div>
              </Html>
            ))}
        </>
      ) : (
        <ParametricSurfaceMesh surface={totalSurface} segU={96} segV={96} />
      )}
    </>
  )
}

export function Theory() {
  const { mode, anglesDeg, angleSumDeg, excess, areaNumeric, intKdA, expected, chiLabel, willmore } =
    useGaussBonnet()

  return (
    <>
      {mode === 'triangle' ? (
        <>
          <TheorySection title="Geodesic triangle on the sphere">
            <P>
              Drag the vertices A, B, C directly on the sphere. The edges are
              great-circle arcs (κ_g = 0), so Gauss–Bonnet reduces to Girard’s
              theorem.
            </P>
            <Equation>{String.raw`\alpha+\beta+\gamma = \pi + \int_T K\,dA`}</Equation>
          </TheorySection>
          <TheorySection title="Angles">
            <Readout label="α at A" tex="\alpha" value={`${anglesDeg[0].toFixed(1)}°`} />
            <Readout label="β at B" tex="\beta" value={`${anglesDeg[1].toFixed(1)}°`} />
            <Readout label="γ at C" tex="\gamma" value={`${anglesDeg[2].toFixed(1)}°`} />
            <Readout label="sum" tex="\alpha+\beta+\gamma" value={`${angleSumDeg.toFixed(1)}°`} />
          </TheorySection>
          <TheorySection title="Two independent computations">
            <Readout
              label="from angles"
              tex="\alpha+\beta+\gamma-\pi"
              value={excess.toFixed(5)}
            />
            <Readout
              label="∬K dA (solid-angle formula)"
              tex="\int_T K\,dA"
              value={intKdA.toFixed(5)}
            />
            <Readout label="patch area" tex="\mathrm{Area}(T)" value={areaNumeric.toFixed(4)} />
            <P>
              The two columns agree: the angle excess of a spherical triangle
              is exactly its area (K = 1/R², unit-sphere excess shown).
            </P>
          </TheorySection>
        </>
      ) : (
        <>
          <TheorySection title="Total Gaussian curvature">
            <Equation>{String.raw`\int_M K\,dA = 2\pi\,\chi(M)`}</Equation>
            <P>
              Numerically integrated over the parameter grid — no topology
              input given to the integrator, yet the answer lands on a
              topological invariant.
            </P>
          </TheorySection>
          <TheorySection title="Result">
            <Readout label="∬K dA (numeric)" tex="\int_M K\,dA" value={intKdA.toFixed(4)} />
            {expected !== null && (
              <Readout label="2πχ expected" tex="2\pi\chi" value={expected.toFixed(4)} />
            )}
            <Readout label="topology" tex="\chi" value={chiLabel} />
            {willmore !== null && (
              <Readout label="Willmore energy" tex="\int_M H^2\,dA" value={willmore.toFixed(3)} />
            )}
            <P>
              Sphere and ellipsoid (χ = 2) integrate to 4π; the torus (χ = 0)
              to 0 — positive outer curvature exactly cancels negative inner
              curvature. For tori, the Willmore energy is conjectured ≥ 2π² ≈
              19.74 (Willmore conjecture, proven 2012).
            </P>
          </TheorySection>
        </>
      )}
      <TheorySection title="Fary–Milnor">
        <P>
          Any nontrivial knot has total curvature ∫κ ds &gt; 4π. Verify it on
          the trefoil in Chapter 1 — its total curvature reads ≈ 13.0 &gt;
          4π ≈ 12.57.
        </P>
      </TheorySection>
    </>
  )
}

export default { meta, Scene, Theory }
