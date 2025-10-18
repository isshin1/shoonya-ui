// ===================== RealTimeChart.tsx =====================
// Full, self-contained file. Replace your current file with this.

"use client"

import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type UTCTimestamp,
  LineStyle,
  ColorType,
} from 'lightweight-charts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { fetchHistoricalData } from '@/app/api/chartData'
import { LineIcon, TextIcon, UpIcon, DownIcon, ClearIcon, SelectIcon } from '@/components/ChartIcons'

// -------------------- tool constants / types --------------------
const TOOL_NONE_RT = 'none' as const
const TOOL_SELECT_RT = 'select' as const
const TOOL_LINE_RT = 'line' as const
const TOOL_TEXT_RT = 'text' as const
const TOOL_UP_RT = 'uparrow' as const
const TOOL_DOWN_RT = 'downarrow' as const
const TOOL_RECT_RT = 'rect' as const

type PointRT = { x: number; y: number }
type LineShapeRT = { tool: 'line' | 'uparrow' | 'downarrow' | 'rect'; x1: number; y1: number; x2: number; y2: number }
type TextShapeRT = { type: 'text'; x: number; y: number; text: string }
type ShapeRT = LineShapeRT | TextShapeRT

interface RealTimeChartWithTimePropsRT {
  atmCallSymbol: string
  atmPutSymbol: string
  atmFutureSymbol: string
  currentTab: 'fut' | 'call' | 'put'
  atmCallPrice: number
  atmPutPrice: number
  atmFuturePrice?: number
  atmCallTt: number
  atmPutTt: number
  atmFutureTt?: number
}

// canonical shapes that we persist (chart anchored: time + price)
type ChartLineShape = {
  tool: 'line' | 'uparrow' | 'downarrow' | 'rect'
  time1: UTCTimestamp | number
  price1: number
  time2: UTCTimestamp | number
  price2: number
}
type ChartTextShape = { type: 'text'; time: UTCTimestamp | number; price: number; text: string }
type ChartShape = ChartLineShape | ChartTextShape

const DRAWINGS_STORAGE_PREFIX = 'myapp.realtimechart.drawings.v1'

// -------------------- helper utilities --------------------
const convertToIST = (timestamp: number): Date => {
  const date = new Date(timestamp * 1000)
  return new Date(date.getTime() + 5.5 * 60 * 60 * 1000)
}
const formatTimeIST = (timestamp: UTCTimestamp): string => {
  const date = convertToIST(Number(timestamp))
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function safeParseChartShapes(json: string | null): ChartShape[] {
  if (!json) return []
  try {
    const parsed = JSON.parse(json)
    if (!parsed) return []
    if (Array.isArray(parsed)) return parsed as ChartShape[]
    if (Array.isArray((parsed as any).chartShapes)) return (parsed as any).chartShapes as ChartShape[]
    return []
  } catch {
    return []
  }
}
function storageKeyForSymbol(symbol: string) {
  return `${DRAWINGS_STORAGE_PREFIX}.${symbol}`
}

// -------------------- component --------------------
export function RealTimeChart({
  atmCallSymbol,
  atmPutSymbol,
  atmFutureSymbol,
  currentTab,
  atmCallPrice,
  atmPutPrice,
  atmFuturePrice,
  atmCallTt,
  atmPutTt,
  atmFutureTt,
}: RealTimeChartWithTimePropsRT) {
  // chart refs & state
  const chartContainerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [windowWidth, setWindowWidth] = useState<number>(0)
   const [currentSymbol, setCurrentSymbol] = useState<string>('')
  // toolbar drag
  const toolbarRef = useRef<HTMLDivElement | null>(null)
  const toolbarDraggingRef = useRef(false)
  const toolbarOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 })
  const [toolbarPos, setToolbarPos] = useState<{ left: number; top: number }>({ left: 8, top: 8 })

  // svg overlay state
  const svgRef = useRef<SVGSVGElement | null>(null)
  const drawingStartRef = useRef<PointRT | null>(null)
  const tempShapeRef = useRef<LineShapeRT | null>(null)
  const [tempShape, setTempShape] = useState<LineShapeRT | null>(null)
    const reprojectRef = useRef<(() => void) | null>(null)
  const [activeTool, setActiveTool] = useState<
    typeof TOOL_NONE_RT | typeof TOOL_SELECT_RT | typeof TOOL_LINE_RT | typeof TOOL_TEXT_RT | typeof TOOL_UP_RT | typeof TOOL_DOWN_RT | typeof TOOL_RECT_RT
  >(TOOL_NONE_RT)

  // Canonical chart-anchored shapes persisted
  const [chartShapes, setChartShapes] = useState<ChartShape[]>([])
  // Authoritative pixel reprojections for `chartShapes`
  const [chartPixelShapes, setChartPixelShapes] = useState<ShapeRT[]>([])

  // overlays store transient offsets so previews stay attached when chart reprojects
  type OverlayEntry = { kind: 'whole' | 'handle'; dx: number; dy: number; handleIndex?: number; base?: ShapeRT }
  const [overlayShapes, setOverlayShapes] = useState<Record<number, OverlayEntry>>({})

  // selection + drag meta
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const dragInfoRef = useRef<{
    kind: 'handle' | 'shape' | null
    shapeIndex: number | null
    handleIndex: number | null
    startPointer?: PointRT
    startChartShape?: ChartShape
    startPixelShape?: ShapeRT
  }>({ kind: null, shapeIndex: null, handleIndex: null })

  // throttling
  const rafIdRef = useRef<number | null>(null)
  const isPointerDraggingRef = useRef(false)

  // initialization
  useEffect(() => setWindowWidth(window.innerWidth), [])

  useEffect(() => {
    setIsMounted(true)
    return () => {
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
    }
  }, [])


  
  // toolbar drag handlers
  useEffect(() => {
    const onPointerMove = (e: PointerEvent) => {
      if (!toolbarDraggingRef.current) return
      const newLeft = e.clientX - toolbarOffsetRef.current.x
      const newTop = e.clientY - toolbarOffsetRef.current.y
      const vw = window.innerWidth
      const vh = window.innerHeight
      const el = toolbarRef.current
      const w = el?.offsetWidth ?? 160
      const h = el?.offsetHeight ?? 40
      const left = Math.max(0, Math.min(newLeft, vw - w - 8))
      const top = Math.max(0, Math.min(newTop, vh - h - 8))
      setToolbarPos({ left, top })
    }
    const onPointerUp = (e: PointerEvent) => {
      if (!toolbarDraggingRef.current) return
      toolbarDraggingRef.current = false
      try { (e.target as Element).releasePointerCapture?.(e.pointerId) } catch {}
    }
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
    }
  }, [])

  // create chart
  useEffect(() => {
    if (isMounted && chartContainerRef.current && !chartRef.current) {
      const container = chartContainerRef.current
      const width = container.clientWidth || windowWidth - 32
      const height = container.clientHeight || Math.min(400, window.innerHeight * 0.4)

      chartRef.current = createChart(container, {
        width,
        height,
        layout: { background: { type: ColorType.Solid, color: 'white' }, textColor: 'black' },
        grid: {
          vertLines: { color: '#e0e0e0', style: LineStyle.Dashed, visible: windowWidth > 768 },
          horzLines: { color: '#e0e0e0', style: LineStyle.Dashed, visible: windowWidth > 768 },
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
          tickMarkFormatter: (t: UTCTimestamp) => formatTimeIST(t),
          rightOffset: windowWidth < 768 ? 5 : 12,
          barSpacing: windowWidth < 768 ? 4 : 6,
          minBarSpacing: windowWidth < 768 ? 0.5 : 1,
        },
        crosshair: {
          vertLine: { labelVisible: true, labelBackgroundColor: 'rgba(46, 46, 46, 0.8)', width: windowWidth < 768 ? 1 : 2 },
          horzLine: { labelVisible: true, labelBackgroundColor: 'rgba(46, 46, 46, 0.8)', width: windowWidth < 768 ? 1 : 2 },
        },
        localization: { timeFormatter: (t: UTCTimestamp) => formatTimeIST(t) },
        rightPriceScale: { scaleMargins: { top: 0.1, bottom: 0.1 }, borderVisible: false, entireTextOnly: windowWidth < 768 },
        handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: true },
        handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
      })

      setIsInitialized(true)
    }
  }, [isMounted, windowWidth])


  
  // convert canonical chartShapes -> pixel shapes (authoritative)
  const reprojectChartShapesToPixels = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current)
      rafIdRef.current = null
    }
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null
      if (!chartRef.current || !seriesRef.current) {
        setChartPixelShapes([])
        return
      }
      const pixelShapes: ShapeRT[] = []
      for (const s of chartShapes) {
        if ((s as ChartTextShape).type === 'text') {
          const tx = (() => {
            const chart = chartRef.current!, series = seriesRef.current!
            try {
              const x = chart.timeScale().timeToCoordinate((s as ChartTextShape).time)
              const y = series.priceToCoordinate((s as ChartTextShape).price)
              if (x == null || y == null) return null
              return { type: 'text', x, y, text: (s as ChartTextShape).text } as TextShapeRT
            } catch { return null }
          })()
          pixelShapes.push(tx ?? { type: 'text', x: 0, y: 0, text: (s as ChartTextShape).text })
        } else {
          const ln = (() => {
            const chart = chartRef.current!, series = seriesRef.current!
            try {
              const x1 = chart.timeScale().timeToCoordinate((s as ChartLineShape).time1)
              const x2 = chart.timeScale().timeToCoordinate((s as ChartLineShape).time2)
              const y1 = series.priceToCoordinate((s as ChartLineShape).price1)
              const y2 = series.priceToCoordinate((s as ChartLineShape).price2)
              if (x1 == null || x2 == null || y1 == null || y2 == null) return null
              return { tool: (s as ChartLineShape).tool, x1, y1, x2, y2 } as LineShapeRT
            } catch { return null }
          })()
          pixelShapes.push(ln ?? { tool: (s as ChartLineShape).tool, x1: 0, y1: 0, x2: 0, y2: 0 })
        }
      }
      setChartPixelShapes(pixelShapes)
      // overlay offsets persist as dx/dy relative to these canonical pixels; no extra action here.
    })
  }, [chartShapes])

  useEffect(() => {
    reprojectChartShapesToPixels()
  }, [chartShapes, reprojectChartShapesToPixels, windowWidth, isInitialized])

  useEffect(() => {
  reprojectRef.current = reprojectChartShapesToPixels
}, [reprojectChartShapesToPixels])



// autosave chartShapes (per-symbol + global) — single debounced effect
const DRAWINGS_STORAGE_KEY = `${DRAWINGS_STORAGE_PREFIX}.global`

useEffect(() => {
  // debounce so rapid edits don't thrash localStorage
  const id = window.setTimeout(() => {
    try {
      // per-symbol autosave (if symbol is known)
      if (currentSymbol) {
        try {
          saveChartShapesForSymbol(currentSymbol, chartShapes)
        } catch (err) {
          console.warn('Per-symbol autosave failed', err)
        }
      }

      // always write a global backup
      try {
        localStorage.setItem(DRAWINGS_STORAGE_KEY, JSON.stringify({ version: 1, chartShapes }))
      } catch (err) {
        console.warn('Global autosave failed', err)
      }
    } catch (err) {
      console.warn('Autosave outer error', err)
    }
  }, 300)

  return () => clearTimeout(id)
}, [chartShapes, currentSymbol])




  // subscribe to time/price changes + resize
  useEffect(() => {
    if (!chartRef.current) return
    const chart = chartRef.current
    const unsubTime = chart.timeScale().subscribeVisibleTimeRangeChange(() => reprojectChartShapesToPixels())
    let unsubPrice: (() => void) | null = null
    try {
      const priceScale = (chart as any).priceScale && (chart as any).priceScale('right')
      if (priceScale && typeof priceScale.subscribeVisiblePriceRangeChange === 'function') {
        unsubPrice = priceScale.subscribeVisiblePriceRangeChange(() => reprojectChartShapesToPixels())
      } else if (priceScale && typeof priceScale.subscribeSizeChange === 'function') {
        unsubPrice = priceScale.subscribeSizeChange(() => reprojectChartShapesToPixels())
      } else if (typeof (chart as any).subscribePriceScale === 'function') {
        unsubPrice = (chart as any).subscribePriceScale(() => reprojectChartShapesToPixels())
      }
    } catch (err) {
      console.warn('price scale subscription failed', err)
    }
    const onWindowResize = () => {
      if (!chartRef.current || !chartContainerRef.current) return
      try { chartRef.current.applyOptions({ width: chartContainerRef.current.clientWidth }) } catch {}
      setWindowWidth(window.innerWidth)
      reprojectChartShapesToPixels()
    }
    window.addEventListener('resize', onWindowResize)
    return () => {
      try { if (typeof unsubTime === 'function') unsubTime() } catch {}
      try { if (typeof unsubPrice === 'function') unsubPrice() } catch {}
      window.removeEventListener('resize', onWindowResize)
    }
  }, [reprojectChartShapesToPixels])


  // watch price axis changes (vertical zoom/pan) and reproject overlays
useEffect(() => {
  let rafId: number | null = null
  const prev = { top: Number.NaN, bottom: Number.NaN }
  let running = true

  const tick = () => {
    try {
      const chart = chartRef.current
      const series = seriesRef.current
      const container = chartContainerRef.current
      if (!running || !chart || !series || !container) return

      const height = container.clientHeight || 0
      // coordinate 0 => top of chart area, coordinate height => bottom
      const topPrice = series.coordinateToPrice(0)
      const bottomPrice = series.coordinateToPrice(height)

      const topChanged = (topPrice == null && !Number.isNaN(prev.top)) || (topPrice != null && topPrice !== prev.top)
      const botChanged = (bottomPrice == null && !Number.isNaN(prev.bottom)) || (bottomPrice != null && bottomPrice !== prev.bottom)

      if (topChanged || botChanged) {
        prev.top = topPrice == null ? Number.NaN : topPrice
        prev.bottom = bottomPrice == null ? Number.NaN : bottomPrice
        // reproject canonical chart shapes -> pixel overlay coords
        reprojectChartShapesToPixels()
      }
    } catch (err) {
      // swallow — keep loop alive
    } finally {
      if (running) rafId = requestAnimationFrame(tick)
    }
  }

  // start only when chart & series are ready
  if (chartRef.current && seriesRef.current) rafId = requestAnimationFrame(tick)

  const waitForReady = setInterval(() => {
    if (!chartRef.current || !seriesRef.current) return
    if (rafId == null) rafId = requestAnimationFrame(tick)
    clearInterval(waitForReady)
  }, 200)

  return () => {
    running = false
    if (rafId != null) cancelAnimationFrame(rafId)
    clearInterval(waitForReady)
  }
}, [reprojectChartShapesToPixels])

  // UNDO support (Cmd/Ctrl+Z)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isUndo = (e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')
      if (!isUndo) return
      setChartShapes(prev => {
        if (!prev || prev.length === 0) return prev
        return prev.slice(0, -1)
      })
      e.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  // create series & fetch historical data
  const createNewSeries = useCallback((symbol: string) => {
    if (!chartRef.current) return null
    if (seriesRef.current) {
      try { chartRef.current.removeSeries(seriesRef.current) } catch {}
      seriesRef.current = null
    }
    const newSeries = chartRef.current.addCandlestickSeries()
    seriesRef.current = newSeries
    return newSeries
  }, [])

  const fetchDataAndCreateSeries = useCallback(async (symbol: string) => {
    if (!chartRef.current || !symbol) return
    try {
    setCurrentSymbol(symbol)        // <- ensure this is set
      const data = await fetchHistoricalData(symbol)
      const newSeries = createNewSeries(symbol)
      if (newSeries && Array.isArray(data)) newSeries.setData(data as CandlestickData[])
      setTimeout(() => reprojectChartShapesToPixels(), 100)
    } catch (e) { console.error(e); setError(`Failed to load ${symbol}`) }
  }, [createNewSeries, reprojectChartShapesToPixels])

// --- replace the existing "load per-symbol drawings when currentSymbol changes" effect with this ---
// --- replace the existing "load per-symbol drawings when currentSymbol changes" effect with this ---
        useEffect(() => {
        if (!currentSymbol) return
        try {
            const loaded = loadChartShapesForSymbol(currentSymbol)

            // only update state if loaded shapes actually differ (avoids extra rerenders)
            setChartShapes(prev => {
            try {
                const prevStr = JSON.stringify(prev ?? [])
                const newStr = JSON.stringify(loaded ?? [])
                if (prevStr === newStr) return prev
            } catch (e) {
                // if stringify fails, fall through to replace
            }
            return loaded
            })

            // call the latest reproject via the stable ref after a short delay
            setTimeout(() => {
            try { reprojectRef.current?.() } catch (e) { /* best-effort */ }
            }, 80)
        } catch (err) {
            console.warn('Failed to load per-symbol drawings', err)
        }
        }, [currentSymbol]) // <-- stable array length: exactly one item


  useEffect(() => {
    if (!isInitialized) return
    let symbol = ''
    if (currentTab === 'call') symbol = atmCallSymbol
    else if (currentTab === 'put') symbol = atmPutSymbol
    else if (currentTab === 'fut') symbol = atmFutureSymbol
    if (symbol) fetchDataAndCreateSeries(symbol)
  }, [isInitialized, currentTab, atmCallSymbol, atmPutSymbol, atmFutureSymbol, fetchDataAndCreateSeries])

  // --- add this effect to keep currentSymbol in sync with the active tab props
    useEffect(() => {
        let symbol = ''
        if (currentTab === 'call') symbol = atmCallSymbol
        else if (currentTab === 'put') symbol = atmPutSymbol
        else if (currentTab === 'fut') symbol = atmFutureSymbol

        if (symbol && symbol !== currentSymbol) {
            setCurrentSymbol(symbol)
        }
    }, [currentTab, atmCallSymbol, atmPutSymbol, atmFutureSymbol, currentSymbol])


  // realtime updates - updating last candle
  const lastUpdateRef = useRef<number>(0)
  const updateChartData = useCallback((symbol: string, price: number, timestamp: number) => {
    if (!price || !timestamp || !seriesRef.current) return
    const currentTime = timestamp
    const threeMinuteTimestamp = (Math.floor(currentTime / (3 * 60)) * 3 * 60) as UTCTimestamp
    if (threeMinuteTimestamp < lastUpdateRef.current) return
    const candle = { time: threeMinuteTimestamp, open: price, high: price, low: price, close: price } as CandlestickData
    try { seriesRef.current.update(candle) } catch {}
    lastUpdateRef.current = threeMinuteTimestamp
    try { seriesRef.current.applyOptions({ lastValueVisible: true }) } catch {}
  }, [])

  const lastProcessedCallRef = useRef<{ price: number; tt: number }>({ price: 0, tt: 0 })
  const lastProcessedPutRef = useRef<{ price: number; tt: number }>({ price: 0, tt: 0 })
  const lastProcessedFutureRef = useRef<{ price: number; tt: number }>({ price: 0, tt: 0 })

  useEffect(() => {
    if (isInitialized && atmCallPrice && atmCallTt && currentTab === 'call') {
      const lastProcessed = lastProcessedCallRef.current
      if (atmCallPrice !== lastProcessed.price || atmCallTt !== lastProcessed.tt) {
        updateChartData(atmCallSymbol, atmCallPrice, atmCallTt)
        lastProcessedCallRef.current = { price: atmCallPrice, tt: atmCallTt }
      }
    }
  }, [isInitialized, currentTab, atmCallPrice, atmCallTt, atmCallSymbol, updateChartData])

  useEffect(() => {
    if (isInitialized && atmPutPrice && atmPutTt && currentTab === 'put') {
      const lastProcessed = lastProcessedPutRef.current
      if (atmPutPrice !== lastProcessed.price || atmPutTt !== lastProcessed.tt) {
        updateChartData(atmPutSymbol, atmPutPrice, atmPutTt)
        lastProcessedPutRef.current = { price: atmPutPrice, tt: atmPutTt }
      }
    }
  }, [isInitialized, currentTab, atmPutPrice, atmPutTt, atmPutSymbol, updateChartData])

  useEffect(() => {
    if (isInitialized && atmFuturePrice && atmFutureTt && currentTab === 'fut') {
      const lastProcessed = lastProcessedFutureRef.current
      if (atmFuturePrice !== lastProcessed.price || atmFutureTt !== lastProcessed.tt) {
        updateChartData(atmFutureSymbol, atmFuturePrice, atmFutureTt)
        lastProcessedFutureRef.current = { price: atmFuturePrice, tt: atmFutureTt }
      }
    }
  }, [isInitialized, currentTab, atmFuturePrice, atmFutureTt, atmFutureSymbol, updateChartData])

  // persist/load drawings (per-symbol + global)
  function saveChartShapesForSymbol(symbol: string, shapesToSave: ChartShape[]) {
    if (!symbol) return
    try {
      const payload = { version: 1, chartShapes: shapesToSave }
      localStorage.setItem(storageKeyForSymbol(symbol), JSON.stringify(payload))
    } catch (e) { console.warn('Failed to save drawings for', symbol, e) }
  }
  function loadChartShapesForSymbol(symbol: string): ChartShape[] {
    if (!symbol) return []
    try {
      const raw = localStorage.getItem(storageKeyForSymbol(symbol))
      return safeParseChartShapes(raw)
    } catch (e) { console.warn('Failed to load drawings for', symbol, e); return [] }
  }

  const handleSaveNow = () => {
    try {
      localStorage.setItem(DRAWINGS_STORAGE_KEY, JSON.stringify({ version: 1, chartShapes }))
    } catch (e) { console.warn(e) }
  }
  const handleLoadNow = () => {
    try {
      const raw = localStorage.getItem(DRAWINGS_STORAGE_KEY)
      const loaded = safeParseChartShapes(raw)
      setChartShapes(loaded)
    } catch (e) { console.warn(e) }
  }
  const handleClearSaved = () => {
    localStorage.removeItem(DRAWINGS_STORAGE_KEY)
    setChartShapes([])
    setChartPixelShapes([])
    setOverlayShapes({})
  }

  // When current symbol changes you may want to load per-symbol drawings.
  // (You did this earlier; if you want per-symbol drawings, hook setCurrentSymbol and load here)

  // -------------------- drawing & dragging handlers --------------------
  const handleRadius = 6
  const getHandlesForPixelShape = (s: ShapeRT) => {
    if ('type' in s && s.type === 'text') {
      return [{ x: s.x, y: s.y }]
    }
    return [{ x: (s as LineShapeRT).x1, y: (s as LineShapeRT).y1 }, { x: (s as LineShapeRT).x2, y: (s as LineShapeRT).y2 }]
  }

  const onSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    const container = chartContainerRef.current
    if (!svg || !container) return
    const target = e.target as Element
    if (target && (target.getAttribute?.('data-handle') || target.getAttribute?.('data-shape'))) return
    if (!(activeTool === TOOL_LINE_RT || activeTool === TOOL_UP_RT || activeTool === TOOL_DOWN_RT || activeTool === TOOL_TEXT_RT || activeTool === TOOL_RECT_RT)) return

    const rect = container.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // clear overlay when beginning a new drawing to avoid conflicts
    setOverlayShapes({})

    if (activeTool === TOOL_TEXT_RT) {
      const label = window.prompt('Enter text:')
      if (!label) return
      const chart = chartRef.current; const series = seriesRef.current
      if (!chart || !series) return
      const t = chart.timeScale().coordinateToTime(x)
      const p = series.coordinateToPrice(y)
      if (t == null || p == null) return

      setChartShapes(prev => {
        const next = [...prev, { type: 'text', time: t as UTCTimestamp, price: p, text: label }]
        try { if (currentSymbol) saveChartShapesForSymbol(currentSymbol, next) } catch (err) { console.warn('Immediate save after text failed', err) }
        return next
        })


      setActiveTool(TOOL_NONE_RT)
      return
    }

    try { svg.setPointerCapture?.(e.pointerId) } catch {}
    drawingStartRef.current = { x, y }
    const newTemp: LineShapeRT = { tool: activeTool as LineShapeRT['tool'], x1: x, y1: y, x2: x, y2: y }
    tempShapeRef.current = newTemp
    setTempShape(newTemp)
    e.preventDefault()
  }

  useEffect(() => {
    const onGlobalPointerDown = (e: PointerEvent) => {
      const t = e.target as Element | null
      if (!t) return
      if (!t.getAttribute?.('data-handle') && !t.getAttribute?.('data-shape')) {
        setSelectedIndex(null)
      }
    }
    window.addEventListener('pointerdown', onGlobalPointerDown)
    return () => window.removeEventListener('pointerdown', onGlobalPointerDown)
  }, [])

  const onSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    const container = chartContainerRef.current
    if (!svg || !container) return
    const rect = container.getBoundingClientRect()
    const client = { x: e.clientX - rect.left, y: e.clientY - rect.top }

    const dragInfo = dragInfoRef.current

    // handle drag preview
    if (dragInfo && dragInfo.kind === 'handle' && dragInfo.shapeIndex != null) {
      const idx = dragInfo.shapeIndex
      const basePixel = chartPixelShapes[idx] ?? dragInfo.startPixelShape
      if (!basePixel) return
      const hi = dragInfo.handleIndex ?? 0
      let baseHandle = { x: 0, y: 0 }
      if ('type' in basePixel && basePixel.type === 'text') baseHandle = { x: basePixel.x, y: basePixel.y }
      else {
        const ln = basePixel as LineShapeRT
        baseHandle = hi === 0 ? { x: ln.x1, y: ln.y1 } : { x: ln.x2, y: ln.y2 }
      }
      const dx = client.x - baseHandle.x
      const dy = client.y - baseHandle.y
      setOverlayShapes(prev => ({ ...prev, [idx]: { kind: 'handle', dx, dy, handleIndex: hi, base: dragInfo.startPixelShape } }))
      isPointerDraggingRef.current = true
      e.preventDefault()
      return
    }

    // whole-shape drag preview (use original startPixelShape as anchor + current dx/dy)
    if (dragInfo && dragInfo.kind === 'shape' && dragInfo.shapeIndex != null && dragInfo.startPointer && dragInfo.startPixelShape) {
      const start = dragInfo.startPointer
      const dx = client.x - start.x
      const dy = client.y - start.y
      const idx = dragInfo.shapeIndex
      setOverlayShapes(prev => ({ ...prev, [idx]: { kind: 'whole', dx, dy, base: dragInfo.startPixelShape } }))
      isPointerDraggingRef.current = true
      e.preventDefault()
      return
    }

    // drawing preview for new shapes
    const start = drawingStartRef.current
    const current = tempShapeRef.current
    if (!start || !current) return
    current.x2 = client.x
    current.y2 = client.y
    tempShapeRef.current = { ...current }
    setTempShape(tempShapeRef.current)
    e.preventDefault()
  }

  const onSvgPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current
    const container = chartContainerRef.current
    if (!svg || !container) return

    const dragInfo = dragInfoRef.current

    // handle drag handle finalization -> map pointer to chart coord and update canonical chartShapes
// handle drag handle finalization -> map pointer to chart coord and update canonical chartShapes
    if (dragInfo && dragInfo.kind === 'handle' && dragInfo.shapeIndex != null) {
    const shapeIndex = dragInfo.shapeIndex
    const handleIndex = dragInfo.handleIndex ?? 0
    const rectBox = container.getBoundingClientRect()
    const clientX = e.clientX - rectBox.left
    const clientY = e.clientY - rectBox.top
    const chart = chartRef.current
    const series = seriesRef.current
    if (chart && series) {
        const finalTime = chart.timeScale().coordinateToTime(clientX)
        const finalPrice = series.coordinateToPrice(clientY)
        if (finalTime != null && finalPrice != null) {
        setChartShapes(prev => {
            const next = prev.slice()
            const s = next[shapeIndex]
            if (!s) return prev
            // line-like shape
            if ((s as ChartLineShape).time1 !== undefined) {
            const ln = s as ChartLineShape
            if (handleIndex === 0) {
                ln.time1 = finalTime as UTCTimestamp
                ln.price1 = finalPrice
            } else {
                ln.time2 = finalTime as UTCTimestamp
                ln.price2 = finalPrice
            }
            } else {
            // text shape
            const tx = s as ChartTextShape
            tx.time = finalTime as UTCTimestamp
            tx.price = finalPrice
            }

            // immediate save (best-effort)
            try { if (currentSymbol) saveChartShapesForSymbol(currentSymbol, next) } catch (err) { console.warn('Immediate save after handle-move failed', err) }

            return next
        })

        setOverlayShapes(prev => { const c = { ...prev }; delete c[shapeIndex]; return c })
        }
    }
    dragInfoRef.current = { kind: null, shapeIndex: null, handleIndex: null }
    isPointerDraggingRef.current = false
    reprojectChartShapesToPixels()
    try { svg.releasePointerCapture?.(e.pointerId) } catch {}
    e.preventDefault()
    return
    }


    // whole-shape drag finalization -> update canonical chartShapes
    if (dragInfo && dragInfo.kind === 'shape' && dragInfo.shapeIndex != null && dragInfo.startChartShape) {
    const shapeIndex = dragInfo.shapeIndex
    const rectBox = container.getBoundingClientRect()
    const prevPx = { x: dragInfo.startPointer?.x ?? 0, y: dragInfo.startPointer?.y ?? 0 }
    const curPx = { x: e.clientX - rectBox.left, y: e.clientY - rectBox.top }
    const chart = chartRef.current
    const series = seriesRef.current
    if (chart && series) {
        const startTime = chart.timeScale().coordinateToTime(prevPx.x)
        const curTime = chart.timeScale().coordinateToTime(curPx.x)
        const startPrice = series.coordinateToPrice(prevPx.y)
        const curPrice = series.coordinateToPrice(curPx.y)
        if (startTime != null && curTime != null && startPrice != null && curPrice != null) {
        const timeDelta = (curTime as number) - (startTime as number)
        const priceDelta = curPrice - startPrice
        setChartShapes(prev => {
            const next = prev.slice()
            const base = dragInfo.startChartShape!
            if ((base as ChartLineShape).time1 !== undefined) {
            const lnBase = base as ChartLineShape
            const lnNext = next[shapeIndex] as ChartLineShape
            lnNext.time1 = (lnBase.time1 as number) + timeDelta
            lnNext.time2 = (lnBase.time2 as number) + timeDelta
            lnNext.price1 = lnBase.price1 + priceDelta
            lnNext.price2 = lnBase.price2 + priceDelta
            } else {
            const txBase = base as ChartTextShape
            const txNext = next[shapeIndex] as ChartTextShape
            txNext.time = (txBase.time as number) + timeDelta
            txNext.price = txBase.price + priceDelta
            }

            // immediate save
            try { if (currentSymbol) saveChartShapesForSymbol(currentSymbol, next) } catch (err) { console.warn('Immediate save after shape-drag failed', err) }

            return next
        })
        setOverlayShapes(prev => { const c = { ...prev }; delete c[shapeIndex]; return c })
        }
    }
    dragInfoRef.current = { kind: null, shapeIndex: null, handleIndex: null }
    isPointerDraggingRef.current = false
    reprojectChartShapesToPixels()
    try { svg.releasePointerCapture?.(e.pointerId) } catch {}
    e.preventDefault()
    return
    }

    // finalize new drawing
    const start = drawingStartRef.current
    const current = tempShapeRef.current
    try { svg.releasePointerCapture?.(e.pointerId) } catch {}
    if (!start || !current) {
      drawingStartRef.current = null
      tempShapeRef.current = null
      setTempShape(null)
      setActiveTool(TOOL_NONE_RT)
      return
    }
    const rectBox = container.getBoundingClientRect()
    const clientX = e.clientX - rectBox.left
    const clientY = e.clientY - rectBox.top
    const finalPixel: LineShapeRT = { ...current, x2: clientX, y2: clientY }
    const chart = chartRef.current; const series = seriesRef.current
    if (chart && series) {
      const t1 = chart.timeScale().coordinateToTime(finalPixel.x1)
      const t2 = chart.timeScale().coordinateToTime(finalPixel.x2)
      const p1 = series.coordinateToPrice(finalPixel.y1)
      const p2 = series.coordinateToPrice(finalPixel.y2)
        if (t1 != null && t2 != null && p1 != null && p2 != null) {
            setChartShapes(prev => {
                const next = [...prev, { tool: finalPixel.tool as ChartLineShape['tool'], time1: t1 as UTCTimestamp, price1: p1, time2: t2 as UTCTimestamp, price2: p2 }]
                try {
                // immediate per-symbol persist (best-effort — don't throw)
                if (currentSymbol) saveChartShapesForSymbol(currentSymbol, next)
                } catch (err) { console.warn('Immediate save after draw failed', err) }
                return next
            })
        }

    }
    drawingStartRef.current = null
    tempShapeRef.current = null
    setTempShape(null)
    setActiveTool(TOOL_NONE_RT)
    reprojectChartShapesToPixels()
    e.preventDefault()
  }

  // Per-handle pointerdown
  const onHandlePointerDown = (e: React.PointerEvent, shapeIndex: number, handleIndex: number) => {
    e.stopPropagation()
    const svg = svgRef.current
    const container = chartContainerRef.current
    if (!svg || !container) return
    try { (e.target as Element).setPointerCapture?.(e.pointerId) } catch {}
    const rect = container.getBoundingClientRect()
    const localStart = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    const startPix = chartPixelShapes[shapeIndex] ? JSON.parse(JSON.stringify(chartPixelShapes[shapeIndex])) as ShapeRT : undefined
    dragInfoRef.current = {
      kind: 'handle',
      shapeIndex,
      handleIndex,
      startPointer: localStart,
      startChartShape: chartShapes[shapeIndex] ? JSON.parse(JSON.stringify(chartShapes[shapeIndex])) : undefined,
      startPixelShape: startPix
    }
    setSelectedIndex(shapeIndex)
  }

  // Per-shape pointerdown (whole-shape drag)
  const onShapePointerDown = (e: React.PointerEvent, shapeIndex: number) => {
    e.stopPropagation()
    const svg = svgRef.current
    const container = chartContainerRef.current
    if (!svg || !container) return
    try { (e.target as Element).setPointerCapture?.(e.pointerId) } catch {}
    const rect = container.getBoundingClientRect()
    const localStart = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    const origPixel = chartPixelShapes[shapeIndex] ? JSON.parse(JSON.stringify(chartPixelShapes[shapeIndex])) as ShapeRT : undefined
    dragInfoRef.current = {
      kind: 'shape',
      shapeIndex,
      handleIndex: null,
      startPointer: localStart,
      startChartShape: chartShapes[shapeIndex] ? JSON.parse(JSON.stringify(chartShapes[shapeIndex])) : undefined,
      startPixelShape: origPixel
    }
    setSelectedIndex(shapeIndex)
  }

  // Arrow path builder
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

  // Toolbar UI
  const ToolbarRT = () => {
    const startDrag = (e: React.PointerEvent) => {
      if (e.button !== 0) return
      e.stopPropagation()
      toolbarDraggingRef.current = true
      toolbarOffsetRef.current = { x: e.clientX - toolbarPos.left, y: e.clientY - toolbarPos.top }
      try { (e.target as Element).setPointerCapture?.(e.pointerId) } catch {}
    }

    return (
      <div
        ref={toolbarRef}
        onPointerDown={startDrag}
        style={{
          position: 'fixed',
          left: toolbarPos.left,
          top: toolbarPos.top,
          zIndex: 9999,
          display: 'flex',
          gap: 6,
          background: 'rgba(255,255,255,0.92)',
          padding: '6px 8px',
          borderRadius: 4,
          boxShadow: '0 2px 14px rgba(0,0,0,0.12)',
          backdropFilter: 'blur(6px)',
          cursor: toolbarDraggingRef.current ? 'grabbing' : 'grab',
          userSelect: 'none',
          touchAction: 'none',
        }}
      >
        {[
          { tool: TOOL_LINE_RT, title: 'Line', icon: <LineIcon /> },
          { tool: TOOL_TEXT_RT, title: 'Text', icon: <TextIcon /> },
          { tool: TOOL_UP_RT, title: 'Up Arrow', icon: <UpIcon /> },
          { tool: TOOL_DOWN_RT, title: 'Down Arrow', icon: <DownIcon /> },
          { tool: TOOL_RECT_RT, title: 'Rectangle', icon: <SelectIcon /> },
        ].map(({ tool, title, icon }) => (
          <button
            key={tool}
            onClick={(ev) => { ev.stopPropagation(); setActiveTool(tool) }}
            title={title}
            style={{
              background: activeTool === tool ? 'rgba(0,0,0,0.08)' : 'transparent',
              border: 'none',
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 2,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => {
              if (activeTool !== tool) (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.05)'
            }}
            onMouseLeave={(e) => {
              if (activeTool !== tool) (e.currentTarget as HTMLElement).style.background = 'transparent'
            }}
          >
            {icon}
          </button>
        ))}

        <button
          onClick={(ev) => { ev.stopPropagation(); setChartShapes([]); setChartPixelShapes([]); setOverlayShapes({}); setSelectedIndex(null) }}
          title="Clear"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 2,
            cursor: 'pointer',
          }}
        >
          <ClearIcon />
        </button>
      </div>
    )
  }

  // Compose displayedShapes from canonical pixels + overlay offsets
  const displayedShapes: ShapeRT[] = chartPixelShapes.slice()
  const overlayKeys = Object.keys(overlayShapes).map(k => Number(k)).filter(k => !Number.isNaN(k)).sort((a,b)=>a-b)
  for (const k of overlayKeys) {
    const entry = overlayShapes[k]
    const base = chartPixelShapes[k] ?? entry.base
    if (!base) continue
    if (entry.kind === 'whole') {
      if ('type' in base && base.type === 'text') {
        displayedShapes[k] = { type: 'text', x: base.x + entry.dx, y: base.y + entry.dy, text: (base as TextShapeRT).text }
      } else {
        const o = base as LineShapeRT
        displayedShapes[k] = { ...o, x1: o.x1 + entry.dx, y1: o.y1 + entry.dy, x2: o.x2 + entry.dx, y2: o.y2 + entry.dy }
      }
    } else if (entry.kind === 'handle') {
      const hi = entry.handleIndex ?? 0
      if ('type' in base && base.type === 'text') {
        displayedShapes[k] = { type: 'text', x: base.x + entry.dx, y: base.y + entry.dy, text: (base as TextShapeRT).text }
      } else {
        const o = base as LineShapeRT
        if (hi === 0) displayedShapes[k] = { ...o, x1: o.x1 + entry.dx, y1: o.y1 + entry.dy }
        else displayedShapes[k] = { ...o, x2: o.x2 + entry.dx, y2: o.y2 + entry.dy }
      }
    }
  }

  // -------------------- render --------------------
  return (
    <Card className="w-full h-full border-none shadow-none rounded-none">
      <CardHeader className="p-2 md:p-4 border-none">
        <CardTitle className="flex justify-between items-center text-sm md:text-base" />
      </CardHeader>
      <CardContent className="p-0 h-[calc(100%-3rem)] md:h-[calc(100%-5rem)] relative">
        <div ref={chartContainerRef} className="w-full h-full min-h-[300px] md:min-h-[400px]" style={{ minHeight: '300px' }}>
          {error ? (
            <div className="flex items-center justify-center w-full h-full">
              <p className="text-red-500 text-sm md:text-base px-4 text-center">{error}</p>
            </div>
          ) : !isInitialized ? (
            <div className="flex items-center justify-center w-full h-full">
              <p className="text-sm md:text-base px-4 text-center">Initializing chart...</p>
            </div>
          ) : null}
        </div>

        <ToolbarRT />

        {/* <div style={{ position: 'absolute', right: 8, top: 8, zIndex: 20 }}>
          <button onClick={handleSaveNow} title="Save">Save</button>
          <button onClick={handleLoadNow} title="Load">Load</button>
          <button onClick={handleClearSaved} title="Clear Saved">Clear Saved</button>
        </div> */}

        <svg
          ref={svgRef}
          onPointerDown={onSvgPointerDown}
          onPointerMove={onSvgPointerMove}
          onPointerUp={onSvgPointerUp}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            pointerEvents: activeTool === TOOL_NONE_RT ? 'none' : 'auto',
            zIndex: 10
          }}
        >
          {displayedShapes.map((s, i) => {
            if (!s) return null
            const isSelected = selectedIndex === i
            if ('type' in s && s.type === 'text') {
              const handles = getHandlesForPixelShape(s)
              return (
                <g key={i}
                   data-shape={i}
                   onPointerDown={(e) => onShapePointerDown(e, i)}
                   style={{ cursor: 'move', pointerEvents: 'visiblePainted' }}
                >
                  <text x={s.x} y={s.y} fontSize={14} style={{ userSelect: 'none' }}>{s.text}</text>
                  {handles.map((h, hi) => (
                    <circle
                      key={hi}
                      cx={h.x}
                      cy={h.y}
                      r={handleRadius}
                      data-handle={`${i}:${hi}`}
                      style={{ cursor: 'grab', pointerEvents: 'all' }}
                      fill={isSelected ? '#1976d2' : 'transparent'}
                      stroke={isSelected ? '#1976d2' : 'transparent'}
                      strokeWidth={isSelected ? 1 : 0}
                      onPointerDown={(e) => onHandlePointerDown(e, i, hi)}
                    />
                  ))}
                </g>
              )
            }

            const ln = s as LineShapeRT
            const handles = getHandlesForPixelShape(ln)
            if (ln.tool === 'line') {
              return (
                <g key={i}
                   data-shape={i}
                   onPointerDown={(e) => onShapePointerDown(e, i)}
                   style={{ cursor: 'move', pointerEvents: 'visiblePainted' }}
                >
                  <line x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2} stroke="#000" strokeWidth={2} />
                  {handles.map((h, hi) => (
                    <rect
                      key={hi}
                      x={h.x - handleRadius}
                      y={h.y - handleRadius}
                      width={handleRadius * 2}
                      height={handleRadius * 2}
                      rx={2}
                      ry={2}
                      data-handle={`${i}:${hi}`}
                      onPointerDown={(e) => onHandlePointerDown(e, i, hi)}
                      style={{ cursor: 'grab', pointerEvents: 'all' }}
                      fill={isSelected ? '#000' : 'transparent'}
                      stroke={isSelected ? '#000' : 'transparent'}
                      strokeWidth={isSelected ? 1 : 0}
                    />
                  ))}
                </g>
              )
            }

            if (ln.tool === 'uparrow' || ln.tool === 'downarrow') {
              const strokeColor = ln.tool === 'uparrow' ? '#0f9d58' : '#db4437'
              return (
                <g key={i}
                   data-shape={i}
                   onPointerDown={(e) => onShapePointerDown(e, i)}
                   style={{ cursor: 'move', pointerEvents: 'visiblePainted' }}
                >
                  <path d={arrowPath(ln.x1, ln.y1, ln.x2, ln.y2)} stroke={strokeColor} strokeWidth={2} fill="none" />
                  {handles.map((h, hi) => (
                    <rect
                      key={hi}
                      x={h.x - handleRadius}
                      y={h.y - handleRadius}
                      width={handleRadius * 2}
                      height={handleRadius * 2}
                      rx={2}
                      ry={2}
                      data-handle={`${i}:${hi}`}
                      onPointerDown={(e) => onHandlePointerDown(e, i, hi)}
                      style={{ cursor: 'grab', pointerEvents: 'all' }}
                      fill={isSelected ? '#1976d2' : 'transparent'}
                      stroke={isSelected ? '#1976d2' : 'transparent'}
                      strokeWidth={isSelected ? 1 : 0}
                    />
                  ))}
                </g>
              )
            }

            if (ln.tool === 'rect') {
              const x = Math.min(ln.x1, ln.x2)
              const y = Math.min(ln.y1, ln.y2)
              const w = Math.abs(ln.x2 - ln.x1)
              const h = Math.abs(ln.y2 - ln.y1)
              const fill = 'rgba(135,206,250,0.35)'
              const stroke = '#87CEFA'
              return (
                <g key={i}
                   data-shape={i}
                   onPointerDown={(e) => onShapePointerDown(e, i)}
                   style={{ cursor: 'move', pointerEvents: 'visiblePainted' }}
                >
                  <rect x={x} y={y} width={w} height={h} rx={2} ry={2} fill={fill} stroke={stroke} strokeWidth={1} />
                  {handles.map((hpos, hi) => (
                    <rect
                      key={hi}
                      x={hpos.x - handleRadius}
                      y={hpos.y - handleRadius}
                      width={handleRadius * 2}
                      height={handleRadius * 2}
                      rx={2}
                      ry={2}
                      data-handle={`${i}:${hi}`}
                      onPointerDown={(e) => onHandlePointerDown(e, i, hi)}
                      style={{ cursor: 'grab', pointerEvents: 'all' }}
                      fill={isSelected ? '#1976d2' : 'transparent'}
                      stroke={isSelected ? '#1976d2' : 'transparent'}
                      strokeWidth={isSelected ? 1 : 0}
                    />
                  ))}
                </g>
              )
            }

            return null
          })}

          {/* in-flight preview */}
          {tempShape ? (
            tempShape.tool === 'line' ? (
              <line x1={tempShape.x1} y1={tempShape.y1} x2={tempShape.x2} y2={tempShape.y2} stroke="#2962FF" strokeWidth={2} />
            ) : tempShape.tool === 'rect' ? (() => {
              const x = Math.min(tempShape.x1, tempShape.x2)
              const y = Math.min(tempShape.y1, tempShape.y2)
              const w = Math.abs(tempShape.x2 - tempShape.x1)
              const h = Math.abs(tempShape.y2 - tempShape.y1)
              return <rect x={x} y={y} width={w} height={h} rx={2} ry={2} fill={'rgba(135,206,250,0.35)'} stroke={'#87CEFA'} strokeWidth={1} />
            })() : (
              <path d={arrowPath(tempShape.x1, tempShape.y1, tempShape.x2, tempShape.y2)} stroke={tempShape.tool === 'uparrow' ? '#0f9d58' : '#db4437'} strokeWidth={2} fill="none" />
            )
          ) : null}
        </svg>
      </CardContent>
    </Card>
  )
}

// ===================== End RealTimeChart.tsx =====================
