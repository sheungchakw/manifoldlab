import type { LevaStore } from '../types'
import type { ChapterMeta } from '../types'
import { PlaceholderScene } from '../PlaceholderScene'
import { TheorySection, Equation, P } from '@/components/TheoryPanel'

export const meta: ChapterMeta = {
  id: 'curves',
  path: '/curves',
  title: 'Curves & Frenet–Serret',
  subtitle: 'Chapter 1',
  order: 1,
  teaser: 'TNB frames, curvature κ and torsion τ, osculating circles, knots.',
}

export function Scene(_props: { store: LevaStore }) {
  return <PlaceholderScene label="Curves & Frenet–Serret" phase={3} />
}

export function Theory() {
  return (
    <>
      <TheorySection title="Coming in Phase 3">
        <P>
          Animated Frenet frames traveling along helices, knots and Viviani’s
          curve, with live curvature and torsion plots, osculating circles and
          tubes.
        </P>
      </TheorySection>
      <TheorySection title="Frenet–Serret equations">
        <Equation>{String.raw`\begin{pmatrix} T' \\ N' \\ B' \end{pmatrix} = \begin{pmatrix} 0 & \kappa & 0 \\ -\kappa & 0 & \tau \\ 0 & -\tau & 0 \end{pmatrix} \begin{pmatrix} T \\ N \\ B \end{pmatrix}`}</Equation>
      </TheorySection>
    </>
  )
}

export default { meta, Scene, Theory }
