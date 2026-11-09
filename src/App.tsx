import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useRef } from 'react'
import type { Mesh } from 'three'
import { TeX } from '@/components/TeX'

function Torus() {
  const ref = useRef<Mesh>(null)
  useFrame((_, dt) => {
    if (!ref.current) return
    ref.current.rotation.x += dt * 0.3
    ref.current.rotation.y += dt * 0.5
  })
  return (
    <mesh ref={ref}>
      <torusGeometry args={[1.6, 0.6, 48, 128]} />
      <meshStandardMaterial color="#38bdf8" roughness={0.35} metalness={0.1} />
    </mesh>
  )
}

export default function App() {
  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-neutral-800 px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight">ManifoldLab</h1>
        <p className="text-sm text-neutral-400">
          Interactive differential geometry — Phase 0 smoke test
        </p>
      </header>
      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[1fr_380px]">
        <div className="relative min-h-[50vh]">
          <Canvas camera={{ position: [3, 2, 4], fov: 50 }}>
            <color attach="background" args={['#0a0a0a']} />
            <ambientLight intensity={0.4} />
            <directionalLight position={[5, 5, 5]} intensity={1.2} />
            <Torus />
            <OrbitControls makeDefault />
          </Canvas>
        </div>
        <aside className="overflow-y-auto border-l border-neutral-800 p-6">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-400">
            Torus in R³
          </h2>
          <TeX
            block
          >{String.raw`\mathbf{r}(u,v) = \big((R + r\cos v)\cos u,\ (R+r\cos v)\sin u,\ r\sin v\big)`}</TeX>
          <p className="mt-4 text-sm text-neutral-400">
            Gaussian curvature varies over the torus:
          </p>
          <TeX block>{String.raw`K(u,v) = \frac{\cos v}{r\,\big(R + r\cos v\big)}`}</TeX>
          <p className="mt-4 text-xs text-neutral-500">
            Drag to orbit. If you can read the equations and rotate the torus,
            the full pipeline (R3F + KaTeX + Tailwind) is working.
          </p>
        </aside>
      </div>
    </div>
  )
}
