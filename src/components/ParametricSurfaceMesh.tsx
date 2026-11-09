import { useEffect, useMemo } from 'react'
import { BufferGeometry, BufferAttribute, DoubleSide } from 'three'
import type { ParametricSurface } from '@/math/surface'

/**
 * Builds a BufferGeometry from a ParametricSurface on a (segU x segV) grid.
 * Normals come from the analytic normal ru x rv (exact, smooth at seams),
 * falling back to +Y at degenerate points.
 */
export function buildSurfaceGeometry(
  surface: ParametricSurface,
  segU: number,
  segV: number,
): BufferGeometry {
  const { uRange, vRange } = surface
  const vertsX = segU + 1
  const vertsY = segV + 1
  const positions = new Float32Array(vertsX * vertsY * 3)
  const normals = new Float32Array(vertsX * vertsY * 3)
  const uvs = new Float32Array(vertsX * vertsY * 2)
  const us = new Float32Array(vertsX * vertsY)
  const vs = new Float32Array(vertsX * vertsY)

  for (let i = 0; i <= segU; i++) {
    const u = uRange.min + ((uRange.max - uRange.min) * i) / segU
    for (let j = 0; j <= segV; j++) {
      const v = vRange.min + ((vRange.max - vRange.min) * j) / segV
      const idx = i * vertsY + j
      const p = surface.point(u, v)
      positions[idx * 3] = p.x
      positions[idx * 3 + 1] = p.y
      positions[idx * 3 + 2] = p.z
      const n = surface.normal(u, v)
      if (n.lengthSq() > 1e-12) {
        normals[idx * 3] = n.x
        normals[idx * 3 + 1] = n.y
        normals[idx * 3 + 2] = n.z
      } else {
        normals[idx * 3 + 1] = 1
      }
      uvs[idx * 2] = i / segU
      uvs[idx * 2 + 1] = j / segV
      us[idx] = u
      vs[idx] = v
    }
  }

  const indices = new Uint32Array(segU * segV * 6)
  let k = 0
  for (let i = 0; i < segU; i++) {
    for (let j = 0; j < segV; j++) {
      const a = i * vertsY + j
      const b = (i + 1) * vertsY + j
      const c = (i + 1) * vertsY + (j + 1)
      const d = i * vertsY + (j + 1)
      indices[k++] = a
      indices[k++] = b
      indices[k++] = d
      indices[k++] = b
      indices[k++] = c
      indices[k++] = d
    }
  }

  const geom = new BufferGeometry()
  geom.setAttribute('position', new BufferAttribute(positions, 3))
  geom.setAttribute('normal', new BufferAttribute(normals, 3))
  geom.setAttribute('uv', new BufferAttribute(uvs, 2))
  // raw parameter values per vertex (used by curvature shaders etc.)
  geom.setAttribute('paramU', new BufferAttribute(us, 1))
  geom.setAttribute('paramV', new BufferAttribute(vs, 1))
  geom.setIndex(new BufferAttribute(indices, 1))
  return geom
}

interface SurfaceMeshProps {
  surface: ParametricSurface
  segU?: number
  segV?: number
  color?: string
  wireframe?: boolean
  opacity?: number
  /** Per-vertex colors; geometry must be built by the caller. */
  geometry?: BufferGeometry
  onGeometry?: (g: BufferGeometry) => void
}

/** Standard shaded surface mesh (rebuilt when surface/resolution changes). */
export function ParametricSurfaceMesh({
  surface,
  segU = 96,
  segV = 96,
  color = '#7dd3fc',
  wireframe = false,
  opacity = 1,
  onGeometry,
}: SurfaceMeshProps) {
  const geometry = useMemo(
    () => buildSurfaceGeometry(surface, segU, segV),
    [surface, segU, segV],
  )
  useEffect(() => {
    onGeometry?.(geometry)
    return () => geometry.dispose()
  }, [geometry, onGeometry])
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        roughness={0.55}
        metalness={0.05}
        side={DoubleSide}
        wireframe={wireframe}
        transparent={opacity < 1}
        opacity={opacity}
        flatShading={false}
      />
    </mesh>
  )
}
