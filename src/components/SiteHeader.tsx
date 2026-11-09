import { Link, NavLink } from 'react-router-dom'
import { Menu, X, GitBranch } from 'lucide-react'
import { chapters } from '@/chapters/registry'
import { useUIStore } from '@/store'
import { cn } from '@/lib/utils'

export function SiteHeader() {
  const { navOpen, setNavOpen } = useUIStore()
  return (
    <header className="relative z-40 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur">
      <div className="flex h-14 items-center gap-4 px-4 lg:px-6">
        <button
          className="rounded-md p-2 text-neutral-300 hover:bg-neutral-800 lg:hidden"
          onClick={() => setNavOpen(!navOpen)}
          aria-label="Toggle navigation"
        >
          {navOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <Link to="/" className="flex items-baseline gap-2">
          <span className="text-lg font-semibold tracking-tight text-sky-400">
            ManifoldLab
          </span>
          <span className="hidden text-xs text-neutral-500 sm:inline">
            interactive differential geometry
          </span>
        </Link>
        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {chapters.map((c) => (
            <NavLink
              key={c.id}
              to={c.path}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-1.5 text-sm transition-colors',
                  isActive
                    ? 'bg-neutral-800 text-sky-300'
                    : 'text-neutral-400 hover:bg-neutral-800/60 hover:text-neutral-200',
                )
              }
            >
              {c.title}
            </NavLink>
          ))}
        </nav>
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          className="ml-2 hidden rounded-md p-2 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100 lg:inline-flex"
          aria-label="Source on GitHub"
        >
          <GitBranch size={17} />
        </a>
      </div>
      {navOpen && (
        <nav className="absolute inset-x-0 top-full flex flex-col gap-1 border-b border-neutral-800 bg-neutral-950 p-3 lg:hidden">
          {chapters.map((c) => (
            <NavLink
              key={c.id}
              to={c.path}
              onClick={() => setNavOpen(false)}
              className={({ isActive }) =>
                cn(
                  'rounded-md px-3 py-2 text-sm',
                  isActive ? 'bg-neutral-800 text-sky-300' : 'text-neutral-300',
                )
              }
            >
              {c.subtitle} · {c.title}
            </NavLink>
          ))}
        </nav>
      )}
    </header>
  )
}
