import katex from 'katex'
import { useMemo } from 'react'

interface TeXProps {
  children: string
  block?: boolean
  className?: string
}

/**
 * Minimal KaTeX wrapper (avoids react-katex React-19 peer-dep friction).
 * Use String.raw`...` for LaTeX sources to keep backslashes intact.
 */
export function TeX({ children, block = false, className }: TeXProps) {
  const html = useMemo(
    () =>
      katex.renderToString(children, {
        displayMode: block,
        throwOnError: false,
        output: 'html',
        strict: 'ignore',
      }),
    [children, block],
  )
  const Tag = block ? 'div' : 'span'
  return <Tag className={className} dangerouslySetInnerHTML={{ __html: html }} />
}
