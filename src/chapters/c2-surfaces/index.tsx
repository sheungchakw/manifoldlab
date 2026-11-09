import type { LevaStore } from '../types'
import type { ChapterMeta } from '../types'
import { PlaceholderScene } from '../PlaceholderScene'
import { TheorySection, Equation, P } from '@/components/TheoryPanel'

export const meta: ChapterMeta = {
  id: 'surfaces',
  path: '/surfaces',
  title: 'Surfaces & Fundamental Forms',
  subtitle: 'Chapter 2',
  order: 2,
  teaser: 'First and second fundamental forms, tangent planes, surface zoo.',
}

export function Scene(_props: { store: LevaStore }) {
  return <PlaceholderScene label="Surfaces & Fundamental Forms" phase={4} />
}

export function Theory() {
  return (
    <>
      <TheorySection title="Coming in Phase 4">
        <P>
          A parametric surface engine with a probe that reads out the first and
          second fundamental forms at any point of any catalog surface.
        </P>
      </TheorySection>
      <TheorySection title="Fundamental forms">
        <Equation>{String.raw`I = E\,du^2 + 2F\,du\,dv + G\,dv^2`}</Equation>
        <Equation>{String.raw`II = L\,du^2 + 2M\,du\,dv + N\,dv^2`}</Equation>
      </TheorySection>
    </>
  )
}

export default { meta, Scene, Theory }
