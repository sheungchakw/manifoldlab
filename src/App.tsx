import { Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { SiteHeader } from '@/components/SiteHeader'
import { ChapterLoading } from '@/components/DemoShell'
import { chapterRoutes } from '@/chapters/registry'
import { Home } from '@/pages/Home'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex h-full flex-col">
        <SiteHeader />
        <Suspense fallback={<ChapterLoading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            {chapterRoutes.map(({ meta, Component }) => (
              <Route key={meta.id} path={meta.path} element={<Component />} />
            ))}
            <Route path="*" element={<Home />} />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  )
}
