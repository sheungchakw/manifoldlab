import type { LevaStore } from '../types'
import type { ChapterMeta } from '../types'
import { PlaceholderScene } from '../PlaceholderScene'
import { TheorySection, Equation, P } from '@/components/TheoryPanel'

export const meta: ChapterMeta = {
  id: 'curvature',
  path: '/curvature',
  title: 'Curvature Visualization',
  subtitle: 'Chapter 3',
  order: 3,
  teaser: 'Gaussian & mean curvature colormaps, principal directions, Gauss map.',
}

export function Scene(_props: { store: LevaStore }) {
  return <PlaceholderScene label="Curvature Visualization" phase={5} />
}

export function Theory() {
  return (
    <>
      <TheorySection title="Coming in Phase 5">
        <P>
          Real-time K and H colormaps, principal direction fields, umbilic
          points, the Gauss map, and a Theorema Egregium bending demo.
        </P>
      </TheorySection>
      <TheorySection title="Curvatures">
        <Equation>{String.raw`K = \kappa_1 \kappa_2 = \frac{LN - M^2}{EG - F^2}`}</Equation>
        <Equation>{String.raw`H = \tfrac{1}{2}(\kappa_1 + \kappa_2)`}</Equation>
      </TheorySection>
    </>
  )
}

export default { meta, Scene, Theory }
