import { useEffect, useRef } from 'react'
import type { CurvePlotData } from './store'

interface Props {
  plot: CurvePlotData
  currentT: number
}

/** Small 2D canvas plotting κ(t) and τ(t) with a live position marker. */
export function CurvaturePlot({ plot, currentT }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width
    const H = canvas.height
    const padL = 8
    const padR = 8
    const padT = 14
    const padB = 8
    const { ts, kappas, taus, kMax, tauMax } = plot
    const t0 = ts[0]
    const t1 = ts[ts.length - 1]

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#0c0c12'
    ctx.fillRect(0, 0, W, H)

    // zero line for torsion (can be negative)
    const yZero = padT + (H - padT - padB) / 2
    ctx.strokeStyle = '#26262e'
    ctx.beginPath()
    ctx.moveTo(padL, yZero)
    ctx.lineTo(W - padR, yZero)
    ctx.stroke()

    const xOf = (t: number) => padL + ((t - t0) / (t1 - t0)) * (W - padL - padR)
    const yK = (k: number) => padT + (1 - k / (kMax * 1.08)) * (H - padT - padB)
    const yTau = (tau: number) =>
      yZero - (tau / (tauMax * 1.15)) * ((H - padT - padB) / 2)

    // κ polyline
    ctx.strokeStyle = '#38bdf8'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    kappas.forEach((k, i) => {
      const x = xOf(ts[i])
      const y = yK(k)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    // τ polyline
    ctx.strokeStyle = '#fb923c'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    taus.forEach((tau, i) => {
      const x = xOf(ts[i])
      const y = yTau(tau)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    // current-t marker
    const mx = xOf(Math.min(Math.max(currentT, t0), t1))
    ctx.strokeStyle = 'rgba(250,250,250,0.55)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(mx, padT - 4)
    ctx.lineTo(mx, H - padB)
    ctx.stroke()

    // legend
    ctx.font = '11px Inter, sans-serif'
    ctx.fillStyle = '#38bdf8'
    ctx.fillText('κ(t)', padL + 2, 11)
    ctx.fillStyle = '#fb923c'
    ctx.fillText('τ(t)', padL + 34, 11)
  }, [plot, currentT])

  return (
    <canvas
      ref={ref}
      width={292}
      height={132}
      className="w-full rounded-md border border-neutral-800"
    />
  )
}
