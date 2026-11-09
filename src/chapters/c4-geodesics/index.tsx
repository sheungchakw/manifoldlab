import { useEffect, useMemo } from 'react'
import { useControls } from 'leva'
import { Vector3 } from 'three'
import { Line } from '@react-three/drei'
import { ParametricSurfaceMesh } from '@/components/ParametricSurfaceMesh'
import { Arrow } from '@/components/VectorArrow'
import { ParametricCurve } from '@/math/curve'
import type { ChapterMeta, LevaStore } from '../types'
import { useGeodesicViz } from './store'
import {
  geodesicSurfaceOptions,
  buildGeodesicSurface,
  directionFromAngle,
} from './surfaces'
import { TheorySection, Equation, Readout, P } from '@/components/TheoryPanel'

export const meta: ChapterMeta = {
  id: 'geodesics',
  path: '/geodesics',
  title: 'Geodesics & Parallel Transport',
  subtitle: 'Chapter 4',
  order: 4,
  teaser: 'Straightest paths on surfaces, holonomy, Clairaut’s relation.',
}

const GEO_COLOR = '#34d399'
const TRANSPORT_COLOR = '#facc15'

export function Scene({ store }: { store: LevaStore }) {
  const {
    surface: surfaceId,
    mode: modeRaw,
    geoU,
    geoV,
    geoAngle,
    geoLength,
    geodesicFan,
    transportLat,
    resolution,
  } = useControls(
    {
      surface: { value: 'sphere', options: geodesicSurfaceOptions },
      mode: { value: 'geodesic', options: { 'Geodesic shooting': 'geodesic', 'Parallel transport': 'transport' } },
      geoU: { value: 0.3, min: 0.02, max: 0.98, step: 0.005 },
      geoV: { value: 0.45, min: 0.05, max: 0.95, step: 0.005 },
      geoAngle: { value: 35, min: 0, max: 360, step: 1, label: 'direction (deg)' },
      geoLength: { value: 6.2, min: 0.5, max: 14, step: 0.1 },
      geodesicFan: { value: false, label: 'fan (8 directions)' },
      transportLat: { value: 0.35, min: 0.05, max: 0.95, step: 0.01, label: 'latitude', render: (get) => get('mode') === 'transport' },
      resolution: { value: 88, min: 48, max: 144, step: 8 },
    },
    { store },
  )
  const mode = modeRaw as 'geodesic' | 'transport'

  const { surface, revolutionRadius } = useMemo(
    () => buildGeodesicSurface(surfaceId),
    [surfaceId],
  )

  const u = surface.uRange.min + (surface.uRange.max - surface.uRange.min) * geoU
  const v = surface.vRange.min + (surface.vRange.max - surface.vRange.min) * geoV

  /** Geodesic paths (single or fan). */
  const geodesics = useMemo(() => {
    if (mode !== 'geodesic') return []
    const angles = geodesicFan
      ? Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4)
      : [(geoAngle * Math.PI) / 180]
    return angles.map((a) => {
      const { du, dv } = directionFromAngle(surface, u, v, a)
      return surface.geodesicPath(u, v, du, dv, geoLength, 0.008).points
    })
  }, [mode, surface, u, v, geoAngle, geoLength, geodesicFan])

  /** Parallel transport along a latitude circle. */
  const transport = useMemo(() => {
    if (mode !== 'transport') return null
    const vv = surface.vRange.min + (surface.vRange.max - surface.vRange.min) * transportLat
    const n = 480
    const path = Array.from({ length: n + 1 }, (_, i) => ({
      u: surface.uRange.min + ((surface.uRange.max - surface.uRange.min) * i) / n,
      v: vv,
    }))
    const w0 = { wu: 0, wv: 1 }
    const frames = surface.parallelTransport(path, w0)
    // Holonomy for closed loops
    let holonomyDeg: number | null = null
    if (surface.uPeriodic) {
      const p0 = path[0]
      const wi = surface.tangentTo3D(p0.u, p0.v, w0.wu, w0.wv)
      const wf = surface.tangentTo3D(p0.u, p0.v, frames[n].wu, frames[n].wv)
      const normal = surface.normal(p0.u, p0.v)
      const cross = wi.clone().cross(wf)
      const sign = Math.sign(cross.dot(normal)) || 1
      holonomyDeg = (wi.angleTo(wf) * 180 * sign) / Math.PI
    }
    // Curve curvature decomposition at the start of the latitude circle
    const curve = new ParametricCurve(
      (t) => surface.point(t, vv),
      { min: surface.uRange.min, max: surface.uRange.max },
      true,
    )
    const t0 = surface.uRange.min
    const kappa = curve.curvature(t0)
    const vel = curve.velocity(t0)
    const acc = curve.acceleration(t0)
    const normal = surface.normal(t0, vv)
    const kappaN = acc.dot(normal) / vel.lengthSq()
    const kappaG2 = Math.max(kappa * kappa - kappaN * kappaN, 0)
    return { path, frames, holonomyDeg, kappa, kappaN, kappaG: Math.sqrt(kappaG2) }
  }, [mode, surface, transportLat])

  /** Clairaut r·sinψ statistics along the first geodesic. */
  const clairaut = useMemo(() => {
    if (mode !== 'geodesic' || !revolutionRadius || geodesics.length === 0) return null
    const { params } = surface.geodesicPath(
      u,
      v,
      ...(() => {
        const { du, dv } = directionFromAngle(surface, u, v, (geoAngle * Math.PI) / 180)
        return [du, dv] as [number, number]
      })(),
      geoLength,
      0.008,
    )
    const values: number[] = []
    for (let i = 4; i < params.length - 4; i++) {
      const p0 = params[i - 2]
      const p1 = params[i + 2]
      const du = (p1.u - p0.u) / 2
      const dv = (p1.v - p0.v) / 2
      const p = params[i]
      const pos = surface.point(p.u, p.v)
      // unit parallel direction (about y-axis)
      const ePar = new Vector3(-pos.z, 0, pos.x)
      if (ePar.lengthSq() < 1e-12) continue
      ePar.normalize()
      const vel3 = surface.tangentTo3D(p.u, p.v, du, dv)
      if (vel3.lengthSq() < 1e-12) continue
      vel3.normalize()
      const rho = revolutionRadius(p.u, p.v)
      values.push(rho * vel3.dot(ePar))
    }
    if (values.length < 4) return null
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const drift = Math.max(...values.map((x) => Math.abs(x - mean)))
    return { mean, drift }
  }, [mode, surface, revolutionRadius, geodesics, u, v, geoAngle, geoLength])

  const setState = useGeodesicViz((s) => s.setState)
  useEffect(() => {
    setState({
      surfaceId,
      mode,
      pathLength: geodesics[0]?.length ?? transport?.path.length ?? 0,
      holonomyDeg: transport?.holonomyDeg ?? null,
      clairaut,
      kappa: transport?.kappa ?? null,
      kappaN: transport?.kappaN ?? null,
      kappaG: transport?.kappaG ?? null,
    })
  }, [surfaceId, mode, geodesics, transport, clairaut, setState])

  return (
    <>
      <ParametricSurfaceMesh surface={surface} segU={resolution} segV={resolution} opacity={0.92} />

      {mode === 'geodesic' && (
        <>
          {geodesics.map(
            (pts, i) =>
              pts.length > 1 && (
                <Line key={i} points={pts} color={GEO_COLOR} lineWidth={2.6} />
              ),
          )}
          <mesh position={surface.point(u, v)}>
            <sphereGeometry args={[0.055, 16, 16]} />
            <meshBasicMaterial color="#fafafa" toneMapped={false} />
          </mesh>
        </>
      )}

      {mode === 'transport' && transport && (
        <>
          <Line
            points={transport.path.map(({ u: uu, v: vv }) => surface.point(uu, vv))}
            color="#a5b4fc"
            lineWidth={1.8}
          />
          {transport.frames.map((f, i) => {
            if (i % 30 !== 0) return null
            const p = transport.path[i]
            const dir = surface.tangentTo3D(p.u, p.v, f.wu, f.wv)
            if (dir.lengthSq() < 1e-12) return null
            return (
              <Arrow
                key={i}
                origin={surface.point(p.u, p.v)}
                dir={dir.normalize()}
                len={0.3}
                color={TRANSPORT_COLOR}
              />
            )
          })}
          {/* initial vector for holonomy comparison */}
          <Arrow
            origin={surface.point(transport.path[0].u, transport.path[0].v)}
            dir={surface.tangentTo3D(transport.path[0].u, transport.path[0].v, 0, 1).normalize()}
            len={0.42}
            color="#f5f5f5"
          />
        </>
      )}
    </>
  )
}

export function Theory() {
  const { surfaceId, mode, holonomyDeg, clairaut, kappa, kappaN, kappaG } = useGeodesicViz()
  const { def } = useMemo(() => buildGeodesicSurface(surfaceId), [surfaceId])

  return (
    <>
      <TheorySection title={def.name}>
        <P>{def.description}</P>
        <Equation>{def.tex}</Equation>
      </TheorySection>

      {mode === 'geodesic' && (
        <>
          <TheorySection title="The geodesic equation">
            <Equation>{String.raw`\ddot{\xi}^k + \Gamma^k_{ij}\,\dot{\xi}^i\dot{\xi}^j = 0`}</Equation>
            <P>
              Integrated numerically from the Christoffel symbols of the metric
              — no closed forms needed. On the sphere every solution is a great
              circle; the fan shows them refocusing at the antipode (conjugate
              points).
            </P>
          </TheorySection>
          {clairaut && (
            <TheorySection title="Clairaut's relation">
              <Readout
                label="r·sin ψ (mean)"
                tex="r\,\sin\psi"
                value={clairaut.mean.toFixed(5)}
              />
              <Readout
                label="max deviation"
                tex="\max|\Delta|"
                value={clairaut.drift.toExponential(1)}
              />
              <P>
                On a surface of revolution, r·sin ψ is conserved along every
                geodesic — the integrator confirms it to numerical precision.
              </P>
            </TheorySection>
          )}
        </>
      )}

      {mode === 'transport' && (
        <>
          <TheorySection title="Parallel transport">
            <Equation>{String.raw`\frac{dw^k}{ds} + \Gamma^k_{ij}\,w^i\,\frac{d\xi^j}{ds} = 0`}</Equation>
            <P>
              The yellow vector is transported along the latitude circle with
              zero covariant derivative — it stays “as parallel as the surface
              allows”. The white arrow is the initial vector.
            </P>
          </TheorySection>
          <TheorySection title="Holonomy">
            {holonomyDeg !== null ? (
              <>
                <Readout label="rotation after one loop" tex="\Delta\theta" value={`${holonomyDeg.toFixed(1)}°`} />
                <P>
                  The vector returns rotated — the deficit angle is the
                  integral of K over the enclosed cap (Gauss–Bonnet, next
                  chapter). On a cylinder or cone it only happens around the
                  apex curvature.
                </P>
              </>
            ) : (
              <P>Holonomy is measured on closed loops (periodic u).</P>
            )}
          </TheorySection>
          <TheorySection title="Curvature of the latitude">
            {kappa !== null && kappaN !== null && kappaG !== null && (
              <>
                <Readout label="κ (space curve)" tex="\kappa" value={kappa.toFixed(4)} />
                <Readout label="normal" tex="\kappa_n" value={kappaN.toFixed(4)} />
                <Readout label="geodesic" tex="\kappa_g" value={kappaG.toFixed(4)} />
                <Equation>{String.raw`\kappa^2 = \kappa_n^2 + \kappa_g^2`}</Equation>
              </>
            )}
          </TheorySection>
        </>
      )}
    </>
  )
}

export default { meta, Scene, Theory }
