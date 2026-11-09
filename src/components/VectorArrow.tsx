import { forwardRef, useMemo } from 'react'
import { Group, Quaternion, Vector3 } from 'three'

const UP_VEC = new Vector3(0, 1, 0)

/** Declarative arrow from `origin` along `dir` with length `len`. */
export function Arrow({
  origin,
  dir,
  len = 1,
  color,
  thickness = 0.03,
}: {
  origin: Vector3 | [number, number, number]
  dir: Vector3
  len?: number
  color: string
  thickness?: number
}) {
  const quat = useMemo(() => {
    if (dir.lengthSq() < 1e-12) return new Quaternion()
    return new Quaternion().setFromUnitVectors(UP_VEC, dir.clone().normalize())
  }, [dir])
  if (dir.lengthSq() < 1e-12 || len <= 0) return null
  return (
    <group position={origin} quaternion={quat} scale={[len, len, len]}>
      <mesh position={[0, 0.41, 0]}>
        <cylinderGeometry args={[thickness, thickness, 0.82, 8]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.91, 0]}>
        <coneGeometry args={[thickness * 2.6, 0.18, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  )
}

interface VectorArrowProps {
  color: string
  /** Shaft radius relative to length. */
  thickness?: number
}

const UP = new Vector3(0, 1, 0)

/**
 * Unit-length arrow along +Y (shaft + head), designed to be driven
 * imperatively from useFrame: set group.quaternion from the direction and
 * group.scale to the desired length. Children positioned via ref.
 */
export const VectorArrow = forwardRef<Group, VectorArrowProps>(
  function VectorArrow({ color, thickness = 0.035 }, ref) {
    const quat = useMemo(() => new Quaternion(), [])
    void quat
    return (
      <group ref={ref}>
        {/* shaft: cylinder from y=0 to y=0.82 */}
        <mesh position={[0, 0.41, 0]}>
          <cylinderGeometry args={[thickness, thickness, 0.82, 8]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
        {/* head: cone from y=0.82 to y=1 */}
        <mesh position={[0, 0.91, 0]}>
          <coneGeometry args={[thickness * 2.6, 0.18, 12]} />
          <meshBasicMaterial color={color} toneMapped={false} />
        </mesh>
      </group>
    )
  },
)

const tmpQuat = new Quaternion()

/** Aim a VectorArrow group along `dir` with length `len`. */
export function aimArrow(group: Group | null, dir: Vector3, len: number) {
  if (!group) return
  if (dir.lengthSq() < 1e-12 || len <= 0) {
    group.visible = false
    return
  }
  group.visible = true
  tmpQuat.setFromUnitVectors(UP, dir.clone().normalize())
  group.quaternion.copy(tmpQuat)
  group.scale.setScalar(len)
}
