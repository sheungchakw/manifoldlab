import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { LevaPanel, useCreateStore } from 'leva'
import { PanelRightClose, PanelRightOpen } from 'lucide-react'
import type { ChapterModule } from '@/chapters/types'
import { useUIStore } from '@/store'
import { cn } from '@/lib/utils'

function CanvasFallback() {
  return (
    <div className="flex h-full items-center justify-center text-sm text-neutral-500">
      Loading scene…
    </div>
  )
}

/**
 * Standard chapter page: 3D canvas on the left, collapsible theory + leva
 * controls panel on the right. The leva store is created per chapter mount,
 * so switching chapters resets the controls cleanly.
 */
export function DemoShell({ module }: { module: ChapterModule }) {
  const { Scene, Theory, meta } = module
  const store = useCreateStore()
  const { theoryOpen, toggleTheory } = useUIStore()

  return (
    <div className="relative flex min-h-0 flex-1">
      {/* 3D canvas */}
      <div className="relative min-w-0 flex-1">
        <Canvas
          camera={{ position: [4, 3, 5], fov: 45 }}
          dpr={[1, 2]}
          gl={{ antialias: true }}
        >
          <color attach="background" args={['#0a0a0f']} />
          <ambientLight intensity={0.45} />
          <directionalLight position={[6, 8, 4]} intensity={1.1} />
          <directionalLight position={[-5, -3, -6]} intensity={0.25} />
          <Suspense fallback={null}>
            <Scene store={store} />
          </Suspense>
          <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
        </Canvas>

        {/* Panel toggle (mobile + collapsed state) */}
        <button
          onClick={toggleTheory}
          className="absolute right-3 top-3 z-20 rounded-md border border-neutral-700/70 bg-neutral-900/80 p-2 text-neutral-300 backdrop-blur hover:bg-neutral-800"
          aria-label="Toggle theory panel"
        >
          {theoryOpen ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
        </button>
      </div>

      {/* Theory + controls panel */}
      <aside
        className={cn(
          'absolute inset-y-0 right-0 z-10 flex w-[340px] max-w-[88vw] flex-col border-l border-neutral-800 bg-neutral-950/95 backdrop-blur transition-transform duration-200 lg:static lg:z-auto lg:bg-neutral-950',
          theoryOpen ? 'translate-x-0' : 'translate-x-full lg:hidden',
        )}
      >
        <div className="border-b border-neutral-800 px-5 py-4">
          <p className="text-[11px] font-medium uppercase tracking-widest text-neutral-500">
            {meta.subtitle}
          </p>
          <h2 className="text-base font-semibold text-neutral-100">{meta.title}</h2>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <Theory />
        </div>
        <div className="max-h-[45%] overflow-y-auto border-t border-neutral-800 leva-panel-dock">
          <LevaPanel store={store} fill flat titleBar={false} />
        </div>
      </aside>
    </div>
  )
}

export function ChapterLoading() {
  return (
    <div className="flex flex-1 items-center justify-center">
      <CanvasFallback />
    </div>
  )
}
