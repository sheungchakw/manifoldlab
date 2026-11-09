import { create } from 'zustand'

interface SurfaceProbeState {
  surfaceId: string
  u: number
  v: number
  setProbe: (p: { surfaceId: string; u: number; v: number }) => void
}

export const useSurfaceProbe = create<SurfaceProbeState>((set) => ({
  surfaceId: 'torus',
  u: 1,
  v: 1,
  setProbe: (p) => set(p),
}))
