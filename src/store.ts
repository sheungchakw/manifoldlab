import { create } from 'zustand'

interface UIState {
  /** Whether the theory/control side panel is open (always open on desktop). */
  theoryOpen: boolean
  setTheoryOpen: (open: boolean) => void
  toggleTheory: () => void
  /** Mobile chapter navigation drawer. */
  navOpen: boolean
  setNavOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  theoryOpen: true,
  setTheoryOpen: (open) => set({ theoryOpen: open }),
  toggleTheory: () => set((s) => ({ theoryOpen: !s.theoryOpen })),
  navOpen: false,
  setNavOpen: (open) => set({ navOpen: open }),
}))
