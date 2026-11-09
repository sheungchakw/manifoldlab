import { create } from 'zustand'

interface GaussBonnetState {
  mode: 'triangle' | 'total'
  anglesDeg: [number, number, number]
  angleSumDeg: number
  excess: number
  areaNumeric: number
  intKdA: number
  expected: number | null
  chiLabel: string
  willmore: number | null
  setState: (p: Partial<Omit<GaussBonnetState, 'setState'>>) => void
}

export const useGaussBonnet = create<GaussBonnetState>((set) => ({
  mode: 'triangle',
  anglesDeg: [0, 0, 0],
  angleSumDeg: 0,
  excess: 0,
  areaNumeric: 0,
  intKdA: 0,
  expected: null,
  chiLabel: '',
  willmore: null,
  setState: (p) => set(p),
}))
