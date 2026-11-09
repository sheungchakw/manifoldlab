import type { LevaStore } from '../types'
import type { ChapterMeta } from '../types'
import { PlaceholderScene } from '../PlaceholderScene'
import { TheorySection, Equation, P } from '@/components/TheoryPanel'

export const meta: ChapterMeta = {
  id: 'gallery',
  path: '/gallery',
  title: 'Special Surfaces Gallery',
  subtitle: 'Chapter 6',
  order: 6,
  teaser: 'Minimal surfaces, pseudosphere, Möbius strip, Klein bottle.',
}

export function Scene(_props: { store: LevaStore }) {
  return <PlaceholderScene label="Special Surfaces Gallery" phase={8} />
}

export function Theory() {
  return (
    <>
      <TheorySection title="Coming in Phase 8">
        <P>
          A curated gallery: the catenoid–helicoid isometric deformation,
          developables unrolling into the plane, and non-orientability demos on
          the Möbius strip and Klein bottle.
        </P>
      </TheorySection>
      <TheorySection title="Minimal surfaces">
        <Equation>{String.raw`H = \tfrac{1}{2}(\kappa_1 + \kappa_2) = 0`}</Equation>
      </TheorySection>
    </>
  )
}

export default { meta, Scene, Theory }
