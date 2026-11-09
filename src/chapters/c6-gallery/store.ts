import { create } from 'zustand'

export type GalleryMode = 'gallery' | 'associate' | 'unroll' | 'mobius' | 'klein'

interface GalleryState {
  mode: GalleryMode
  surfaceId: string
  meanH: number | null
  theta: number
  firstForm: { E: number; F: number; G: number } | null
  alpha: number
  area: number | null
  mobiusLoops: number
  normalFlipped: boolean
  setState: (p: Partial<Omit<GalleryState, 'setState'>>) => void
}

export const useGallery = create<GalleryState>((set) => ({
  mode: 'gallery',
  surfaceId: 'catenoid',
  meanH: null,
  theta: 0,
  firstForm: null,
  alpha: 1,
  area: null,
  mobiusLoops: 0,
  normalFlipped: false,
  setState: (p) => set(p),
}))
