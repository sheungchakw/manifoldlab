import { Link } from 'react-router-dom'
import { ArrowRight, Shapes, Spline, Waves, Compass, Sigma, Sparkles } from 'lucide-react'
import { chapters } from '@/chapters/registry'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TeX } from '@/components/TeX'

const icons = [Spline, Shapes, Waves, Compass, Sigma, Sparkles]

export function Home() {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-10">
          <Badge className="mb-4">MATH 3423 · HKUST-style visual companion</Badge>
          <h1 className="mb-3 text-4xl font-bold tracking-tight">
            Differential geometry,{' '}
            <span className="text-sky-400">made touchable</span>
          </h1>
          <p className="max-w-2xl text-lg text-neutral-400">
            Interactive 3D visualizations of curves, surfaces, curvature,
            geodesics and the great global theorems — every quantity computed
            live from the parametrization.
          </p>
          <div className="mt-4 rounded-lg border border-neutral-800 bg-neutral-900/50 p-4">
            <TeX
              block
            >{String.raw`\int_M K\,dA + \int_{\partial M} \kappa_g\,ds = 2\pi\chi(M)`}</TeX>
            <p className="mt-1 text-xs text-neutral-500">
              The Gauss–Bonnet theorem — you will verify it interactively in
              Chapter 5.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {chapters.map((c, i) => {
            const Icon = icons[i % icons.length]
            return (
              <Link key={c.id} to={c.path} className="group">
                <Card className="h-full transition-colors group-hover:border-sky-500/50">
                  <CardHeader>
                    <div className="mb-1 flex items-center justify-between">
                      <Icon size={20} className="text-sky-400" />
                      <span className="text-xs text-neutral-600">{c.subtitle}</span>
                    </div>
                    <CardTitle className="group-hover:text-sky-300">
                      {c.title}
                    </CardTitle>
                    <CardDescription>{c.teaser}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <span className="inline-flex items-center gap-1 text-sm text-sky-400 opacity-0 transition-opacity group-hover:opacity-100">
                      Open chapter <ArrowRight size={14} />
                    </span>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>

        <p className="mt-10 text-center text-xs text-neutral-600">
          Built with React Three Fiber, KaTeX and a custom numeric differential
          geometry core — every formula on the right panel is evaluated live.
        </p>
      </div>
    </div>
  )
}
