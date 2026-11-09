import { create } from 'zustand'

export interface CurvePlotData {
  ts: number[]
  kappas: number[]
  taus: number[]
  kMax: number
  tauMax: number
}

interface CurveVizState {
  curveId: string
  closed: boolean
  t: number
  kappa: number
  tau: number
  speed: number
  arcLength: number
  totalCurvature: number
  plot: CurvePlotData | null
  setLive: (p: { t: number; kappa: number; tau: number; speed: number }) => void
  setCurveInfo: (p: {
    curveId: string
    closed: boolean
    arcLength: number
    totalCurvature: number
    plot: CurvePlotData
  }) => void
}

export const useCurveViz = create<CurveVizState>((set) => ({
  curveId: 'helix',
  closed: false,
  t: 0,
  kappa: 0,
  tau: 0,
  speed: 0,
  arcLength: 0,
  totalCurvature: 0,
  plot: null,
  setLive: (p) => set(p),
  setCurveInfo: (p) => set(p),
}))
