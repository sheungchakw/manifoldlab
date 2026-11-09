import type { ReactNode } from 'react'
import { TeX } from '@/components/TeX'
import { cn } from '@/lib/utils'

/** Section inside a theory panel. */
export function TheorySection({
  title,
  children,
  className,
}: {
  title?: string
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('mb-5', className)}>
      {title && (
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-sky-400/90">
          {title}
        </h3>
      )}
      <div className="space-y-2 text-sm leading-relaxed text-neutral-300">{children}</div>
    </section>
  )
}

/** Display-mode equation with consistent spacing. */
export function Equation({ children }: { children: string }) {
  return (
    <div className="rounded-md bg-neutral-900 px-3 py-1.5">
      <TeX block>{children}</TeX>
    </div>
  )
}

/** A live numeric readout row. */
export function Readout({
  label,
  tex,
  value,
  className,
}: {
  label: string
  tex?: string
  value: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-3 rounded-md bg-neutral-900/70 px-3 py-1.5',
        className,
      )}
    >
      <span className="text-xs text-neutral-400">
        {tex ? <TeX>{tex}</TeX> : label}
      </span>
      <span className="font-mono text-sm text-sky-300">{value}</span>
    </div>
  )
}

/** Prose paragraph with muted styling. */
export function P({ children }: { children: ReactNode }) {
  return <p className="text-sm text-neutral-400">{children}</p>
}
