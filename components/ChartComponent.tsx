// ===================== ChartComponent.tsx =====================
// TypeScript React version with SVG overlay drawing tools (line, text, up-arrow, down-arrow)

import React, { useEffect, useRef, useState } from 'react'
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts'

type Point = { x: number; y: number }

type LineShape = { tool: 'line' | 'uparrow' | 'downarrow'; x1: number; y1: number; x2: number; y2: number }
type TextShape = { type: 'text'; x: number; y: number; text: string }
type Shape = LineShape | TextShape

const TOOL_NONE = 'none' as const
const TOOL_LINE = 'line' as const
const TOOL_TEXT = 'text' as const
const TOOL_UP = 'uparrow' as const
const TOOL_DOWN = 'downarrow' as const

interface ChartProps {
  data: Array<any>
  colors?: {
    backgroundColor?: string
    lineColor?: string
    textColor?: string
    areaTopColor?: string
    areaBottomColor?: string
  }
}

export default function Chart(props: ChartProps) {
  const {
    data,
    colors: {
      backgroundColor = 'white',
      lineColor = '#2962FF',
      textColor = 'black',
      areaTopColor = '#2962FF',
      areaBottomColor = 'rgba(41, 98, 255, 0.28)',
    } = {},
  } = props

  const chartContainerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null)
  const svgRef = useRef<SVGSVGElement | null>(null)

  const [activeTool, setActiveTool] = useState<typeof TOOL_NONE | typeof TOOL_LINE | typeof TOOL_TEXT | typeof TOOL_UP | typeof TOOL_DOWN>(TOOL_NONE)
  const [tempShape, setTempShape] = useState<LineShape | null>(null)
  const [shapes, setShapes] = useState<Shape[]>([])

  useEffect(() => {
    if (!chartContainerRef.current) return

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: backgroundColor },
        textColor,
      },
      width: chartContainerRef.current.clientWidth,
      height: 300,
    })

    chart.timeScale().fitContent()

    const newSeries = chart.addAreaSeries({
      lineColor,
      topColor: areaTopColor,
      bottomColor: areaBottomColor,
    })
    newSeries.setData(data)

    chartRef.current = chart
    seriesRef.current = newSeries

    const handleResize = () => {
      if (!chartContainerRef.current) return
      chart.applyOptions({ width: chartContainerRef.current.clientWidth })
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      chart.remove()
      chartRef.current = null
    }
  }, [data, backgroundColor, lineColor, textColor, areaTopColor, areaBottomColor])

  const getRect = (): DOMRect => {
    if (!chartContainerRef.current) throw new Error('chart container missing')
    return chartContainerRef.current.getBoundingClientRect()
  }

  useEffect(() => {
    const svg = svgRef.current
    if (!svg || !chartContainerRef.current) return

    let drawingStart: Point | null = null

    const onPointerDown = (e: PointerEvent) => {
      if (activeTool === TOOL_NONE) return
      const rect = getRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      drawingStart = { x, y }

      if (activeTool === TOOL_TEXT) {
        const label = window.prompt('Enter text:')
        if (!label) return
        const textShape: TextShape = { type: 'text', x, y, text: label }
        setShapes(prev => [...prev, textShape])
      } else {
        setTempShape({ tool: activeTool, x1: x, y1: y, x2: x, y2: y })
      }
      e.preventDefault()
    }

    const onPointerMove = (e: PointerEvent) => {
      if (!drawingStart || !tempShape) return
      const rect = getRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      setTempShape(prev => prev ? { ...prev, x2: x, y2: y } : prev)
    }

    const onPointerUp = () => {
      if (!drawingStart) return
      if (tempShape) {
        setShapes(prev => [...prev, tempShape])
        setTempShape(null)
      }
      drawingStart = null
    }

    svg.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    return () => {
      svg.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [activeTool, tempShape])

  const arrowPath = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.sqrt(dx * dx + dy * dy) || 1
    const ux = dx / len
    const uy = dy / len
    const headSize = 10
    const hx = x2 - ux * headSize
    const hy = y2 - uy * headSize
    const px = -uy
    const py = ux
    const leftX = hx + px * (headSize / 2)
    const leftY = hy + py * (headSize / 2)
    const rightX = hx - px * (headSize / 2)
    const rightY = hy - py * (headSize / 2)
    return `M ${x1} ${y1} L ${x2} ${y2} M ${leftX} ${leftY} L ${x2} ${y2} L ${rightX} ${rightY}`
  }

  const Toolbar = () => (
    <div style={{ position: 'absolute', left: 8, top: 8, zIndex: 20, display: 'flex', gap: 8 }}>
      <button onClick={() => setActiveTool(TOOL_LINE)}>Line</button>
      <button onClick={() => setActiveTool(TOOL_TEXT)}>Text</button>
      <button onClick={() => setActiveTool(TOOL_UP)}>Up ▲</button>
      <button onClick={() => setActiveTool(TOOL_DOWN)}>Down ▼</button>
      <button onClick={() => { setActiveTool(TOOL_NONE); setTempShape(null) }}>Select/None</button>
      <button onClick={() => setShapes([])}>Clear</button>
    </div>
  )

  return (
    <div style={{ position: 'relative', width: '100%', height: 300 }}>
      <div ref={chartContainerRef} style={{ width: '100%', height: '100%' }} />
      <Toolbar />
      <svg ref={svgRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'auto', zIndex: 10 }}>
        {shapes.map((s, idx) => {
          if ('type' in s && s.type === 'text') {
            return (
              <text key={idx} x={s.x} y={s.y} fontSize={14} fill={textColor} style={{ userSelect: 'none' }}>{s.text}</text>
            )
          }
          if (s.tool === 'line') return <line key={idx} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={lineColor} strokeWidth={2} />
          if (s.tool === 'uparrow') return <path key={idx} d={arrowPath(s.x1, s.y1, s.x2, s.y2)} stroke={'#0f9d58'} strokeWidth={2} fill="none" />
          if (s.tool === 'downarrow') return <path key={idx} d={arrowPath(s.x1, s.y1, s.x2, s.y2)} stroke={'#db4437'} strokeWidth={2} fill="none" />
          return null
        })}
        {tempShape && (
          tempShape.tool === 'line' ? (
            <line x1={tempShape.x1} y1={tempShape.y1} x2={tempShape.x2} y2={tempShape.y2} stroke={lineColor} strokeWidth={2} />
          ) : (
            <path d={arrowPath(tempShape.x1, tempShape.y1, tempShape.x2, tempShape.y2)} stroke={tempShape.tool === 'uparrow' ? '#0f9d58' : '#db4437'} strokeWidth={2} fill="none" />
          )
        )}
      </svg>
    </div>
  )
}

// ===================== End ChartComponent.tsx =====================
