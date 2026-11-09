import type { ComponentType } from 'react'
import type { useCreateStore } from 'leva'

/** Leva panel store (per-chapter). Leva 0.10 doesn't re-export StoreType. */
export type LevaStore = ReturnType<typeof useCreateStore>

export interface ChapterMeta {
  id: string
  path: string
  title: string
  subtitle: string
  order: number
  /** Short teaser for the home gallery card. */
  teaser: string
}

/**
 * A chapter module: the Scene is rendered inside the R3F Canvas and owns its
 * leva controls (via the passed store); the Theory component renders the
 * KaTeX side-panel content.
 */
export interface ChapterModule {
  meta: ChapterMeta
  Scene: ComponentType<{ store: LevaStore }>
  Theory: ComponentType
}
