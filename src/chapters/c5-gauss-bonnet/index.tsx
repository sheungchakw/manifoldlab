import type { LevaStore } from '../types'
import type { ChapterMeta } from '../types'
import { PlaceholderScene } from '../PlaceholderScene'
import { TheorySection, Equation, P } from '@/components/TheoryPanel'

export const meta: ChapterMeta = {
  id: 'gauss-bonnet',
  path: '/gauss-bonnet',
  title: 'Gauss–Bonnet & Global Theorems',
  subtitle: 'Chapter 5',
  order: 5,
  teaser: 'Watch ∫K dA + boundary terms land exactly on 2πχ, interactively.',
}

export function Scene(_props: { store: LevaStore }) {
  return <PlaceholderScene label="Gauss–Bonnet & Global Theorems" phase={7} />
}

export function Theory() {
  return (
    <>
      <TheorySection title="Coming in Phase 7">
        <P>
          Drag the vertices of a geodesic triangle on a sphere and watch the
          two sides of Gauss–Bonnet agree, plus total curvature, Fary–Milnor
          and Willmore energy readouts.
        </P>
      </TheorySection>
      <TheorySection title="Gauss–Bonnet">
        <Equation>{String.raw`\int_M K\,dA + \int_{\partial M} \kappa_g\,ds + \sum_i \theta_i = 2\pi\chi(M)`}</Equation>
      </TheorySection>
    </>
  )
}

export default { meta, Scene, Theory }
