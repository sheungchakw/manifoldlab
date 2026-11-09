import { create } from 'zustand'

export interface ClairautStats {
  mean: number
  drift: number
}

interface GeodesicVizState {
  surfaceId: string
  mode: 'geodesic' | 'transport'
  pathLength: number
  /** Signed holonomy angle in degrees (closed loops), null otherwise. */
  holonomyDeg: number | null
  clairaut: ClairautStats | null
  kappa: number | null
  kappaN: number | null
  kappaG: number | null
  setState: (p: Partial<Omit<GeodesicVizState, 'setState'>>) => void
}

export const useGeodesicViz = create<GeodesicVizState>((set) => ({
  surfaceId: 'sphere',
  mode: 'geodesic',
  pathLength: 0,
  holonomyDeg: null,
  clairaut: null,
  kappa: null,
  kappaN: null,
  kappaG: null,
  setState: (p) => set(p),
}))
