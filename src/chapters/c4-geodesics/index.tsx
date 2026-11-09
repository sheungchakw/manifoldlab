import type { LevaStore } from '../types'
import type { ChapterMeta } from '../types'
import { PlaceholderScene } from '../PlaceholderScene'
import { TheorySection, Equation, P } from '@/components/TheoryPanel'

export const meta: ChapterMeta = {
  id: 'geodesics',
  path: '/geodesics',
  title: 'Geodesics & Parallel Transport',
  subtitle: 'Chapter 4',
  order: 4,
  teaser: 'Straightest paths on surfaces, holonomy, Clairaut’s relation.',
}

export function Scene(_props: { store: LevaStore }) {
  return <PlaceholderScene label="Geodesics & Parallel Transport" phase={6} />
}

export function Theory() {
  return (
    <>
      <TheorySection title="Coming in Phase 6">
        <P>
          Shoot geodesics from any point in any direction, parallel-transport
          vectors along curves, and measure holonomy around loops.
        </P>
      </TheorySection>
      <TheorySection title="Geodesic equation">
        <Equation>{String.raw`\ddot{\xi}^k + \Gamma^k_{ij}\,\dot{\xi}^i\,\dot{\xi}^j = 0`}</Equation>
      </TheorySection>
    </>
  )
}

export default { meta, Scene, Theory }
