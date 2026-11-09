import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import type { Mesh } from 'three'

/**
 * Temporary scene shown while a chapter is under construction.
 * Replaced by the full interactive scene in the chapter's phase.
 */
export function PlaceholderScene({ label, phase }: { label: string; phase: number }) {
  const ref = useRef<Mesh>(null)
  useFrame((_, dt) => {
    if (!ref.current) return
    ref.current.rotation.x += dt * 0.25
    ref.current.rotation.y += dt * 0.4
  })
  return (
    <>
      <mesh ref={ref}>
        <torusKnotGeometry args={[1.1, 0.32, 128, 24]} />
        <meshStandardMaterial color="#38bdf8" wireframe />
      </mesh>
      <Html center position={[0, -2.2, 0]}>
        <div className="w-64 rounded-lg border border-neutral-800 bg-neutral-950/90 px-4 py-3 text-center">
          <p className="text-sm font-medium text-neutral-200">{label}</p>
          <p className="mt-1 text-xs text-neutral-500">
            Full interactive chapter arrives in Phase {phase}.
          </p>
        </div>
      </Html>
    </>
  )
}
