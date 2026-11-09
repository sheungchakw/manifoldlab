import { create } from 'zustand'

export type ColorMode = 'K' | 'H' | 'class' | 'none'

interface CurvatureVizState {
  surfaceId: string
  colorBy: ColorMode
  u: number
  v: number
  bendAlpha: number
  setState: (p: Partial<Omit<CurvatureVizState, 'setState'>>) => void
}

export const useCurvatureViz = create<CurvatureVizState>((set) => ({
  surfaceId: 'torus',
  colorBy: 'K',
  u: 1,
  v: 1,
  bendAlpha: 0,
  setState: (p) => set(p),
}))
