import { lazy, type ComponentType, type LazyExoticComponent } from 'react'
import type { ChapterMeta, ChapterModule } from './types'

interface ChapterEntry {
  meta: ChapterMeta
  importModule: () => Promise<ChapterModule>
}

const entries: ChapterEntry[] = [
  {
    meta: {
      id: 'curves',
      path: '/curves',
      title: 'Curves & Frenet–Serret',
      subtitle: 'Chapter 1',
      order: 1,
      teaser: 'TNB frames, curvature κ and torsion τ, osculating circles, knots.',
    },
    importModule: () => import('./c1-curves'),
  },
  {
    meta: {
      id: 'surfaces',
      path: '/surfaces',
      title: 'Surfaces & Fundamental Forms',
      subtitle: 'Chapter 2',
      order: 2,
      teaser: 'First and second fundamental forms, tangent planes, surface zoo.',
    },
    importModule: () => import('./c2-surfaces'),
  },
  {
    meta: {
      id: 'curvature',
      path: '/curvature',
      title: 'Curvature Visualization',
      subtitle: 'Chapter 3',
      order: 3,
      teaser: 'Gaussian & mean curvature colormaps, principal directions, Gauss map.',
    },
    importModule: () => import('./c3-curvature'),
  },
  {
    meta: {
      id: 'geodesics',
      path: '/geodesics',
      title: 'Geodesics & Parallel Transport',
      subtitle: 'Chapter 4',
      order: 4,
      teaser: 'Straightest paths on surfaces, holonomy, Clairaut’s relation.',
    },
    importModule: () => import('./c4-geodesics'),
  },
  {
    meta: {
      id: 'gauss-bonnet',
      path: '/gauss-bonnet',
      title: 'Gauss–Bonnet & Global Theorems',
      subtitle: 'Chapter 5',
      order: 5,
      teaser: 'Watch ∫K dA + boundary terms land exactly on 2πχ, interactively.',
    },
    importModule: () => import('./c5-gauss-bonnet'),
  },
  {
    meta: {
      id: 'gallery',
      path: '/gallery',
      title: 'Special Surfaces Gallery',
      subtitle: 'Chapter 6',
      order: 6,
      teaser: 'Minimal surfaces, pseudosphere, Möbius strip, Klein bottle.',
    },
    importModule: () => import('./c6-gallery'),
  },
]

export const chapters: ChapterMeta[] = entries
  .map((e) => e.meta)
  .sort((a, b) => a.order - b.order)

export interface ChapterRoute {
  meta: ChapterMeta
  Component: LazyExoticComponent<ComponentType>
}

import { createElement } from 'react'
import { DemoShell } from '@/components/DemoShell'

export const chapterRoutes: ChapterRoute[] = entries.map((e) => ({
  meta: e.meta,
  Component: lazy(async () => {
    const mod = await e.importModule()
    return { default: () => createElement(DemoShell, { module: mod }) }
  }),
}))
