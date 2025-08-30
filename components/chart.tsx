"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type UTCTimestamp,
  LineStyle,
  ColorType,
} from "lightweight-charts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchHistoricalData } from "@/app/api/chartData"

interface RealTimeChartWithTimeProps {
  atmCallSymbol: string
  atmPutSymbol: string
  currentTab: "call" | "put"
  atmCallPrice: number
  atmPutPrice: number
  atmCallTt: number
  atmPutTt: number
}

const convertToIST = (timestamp: number): Date => {
  const date = new Date(timestamp * 1000)
  return new Date(date.getTime() + 5.5 * 60 * 60 * 1000 * 0) // Add 5 hours and 30 minutes for IST
}

const formatTimeIST = (timestamp: UTCTimestamp): string => {
  const date = convertToIST(timestamp)
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

function isEmpty(value: string) {
  return (
    value === null ||
    value === undefined ||
    value === "" ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === "object" && Object.keys(value).length === 0)
  )
}

export function RealTimeChart({
  atmCallSymbol,
  atmPutSymbol,
  currentTab,
  atmCallPrice,
  atmPutPrice,
  atmCallTt,
  atmPutTt,
}: RealTimeChartWithTimeProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [historicalData, setHistoricalData] = useState<CandlestickData[]>([])
  const lastUpdateRef = useRef<number>(0)
  const currentSymbolRef = useRef<string>("")
  const [windowWidth, setWindowWidth] = useState(0)

  useEffect(() => {
    setWindowWidth(window.innerWidth)
  }, [])

  // Add refs to track last processed prices and timestamps
  const lastProcessedCallRef = useRef<{ price: number; tt: number }>({ price: 0, tt: 0 })
  const lastProcessedPutRef = useRef<{ price: number; tt: number }>({ price: 0, tt: 0 })

  const createNewSeries = useCallback((symbol: string) => {
    if (!chartRef.current) return null

    if (seriesRef.current) {
      chartRef.current.removeSeries(seriesRef.current)
    }

    const newSeries = chartRef.current.addCandlestickSeries({
      upColor: "#148564",
      downColor: "#DB542A",
      borderVisible: false,
      wickUpColor: "#148564",
      wickDownColor: "#DB542A",
      title: symbol.includes("C") ? "Call" : "Put",
      visible: true,
    })

    seriesRef.current = newSeries
    return newSeries
  }, [])

  const fetchDataAndCreateSeries = useCallback(
    async (symbol: string) => {
      if (!chartRef.current || isEmpty(symbol) || currentSymbolRef.current === symbol) {
        console.log("Skipping fetch - same symbol or no chart")
        return
      }

      currentSymbolRef.current = symbol

      try {
        console.log(`Fetching historical data for ${symbol}...`)
        const data = await fetchHistoricalData(symbol)
        console.log(`Historical data fetched for ${symbol}:`, { dataLength: data.length })

        setHistoricalData(data)

        // Create new series
        const newSeries = createNewSeries(symbol)
        if (newSeries) {
          newSeries.setData(data)
        }

        // Reset last update tracker for new symbol
        lastUpdateRef.current = 0

        // Reset price tracking for new symbol
        lastProcessedCallRef.current = { price: 0, tt: 0 }
        lastProcessedPutRef.current = { price: 0, tt: 0 }

        console.log(`Chart series created and data set for ${symbol}`)
      } catch (error) {
        console.error(`Error initializing chart for ${symbol}:`, error)
        setError(`Failed to initialize chart data for ${symbol}`)
      }
    },
    [createNewSeries],
  )

  const updateChartData = useCallback(
    (symbol: string, price: number, timestamp: number) => {
      if (!price || !timestamp || !seriesRef.current) {
        return
      }

      const currentTime = timestamp
      const threeMinuteTimestamp = (Math.floor(currentTime / (3 * 60)) * 3 * 60) as UTCTimestamp

      // Ensure we're not processing duplicate or old data
      if (threeMinuteTimestamp < lastUpdateRef.current) {
        console.log("Skipping update: Old or duplicate data", {
          newTimestamp: threeMinuteTimestamp,
          lastUpdate: lastUpdateRef.current,
        })
        return
      }

      // Get current historical data from state
      setHistoricalData(currentData => {
        const lastCandle = currentData[currentData.length - 1]

        if (!lastCandle || threeMinuteTimestamp > lastCandle.time) {
          // Create a new candle
          console.log("Adding new candle")
          const newCandle: CandlestickData = {
            time: threeMinuteTimestamp,
            open: price,
            high: price,
            low: price,
            close: price,
          }
          seriesRef.current?.update(newCandle)
          return [...currentData, newCandle]
        } else if (threeMinuteTimestamp === lastCandle.time) {
          // Update the existing candle
          const updatedCandle: CandlestickData = {
            time: lastCandle.time,
            open: lastCandle.open,
            high: Math.max(lastCandle.high, price),
            low: Math.min(lastCandle.low, price),
            close: price,
          }
          seriesRef.current?.update(updatedCandle)
          return [...currentData.slice(0, -1), updatedCandle]
        }

        return currentData
      })

      lastUpdateRef.current = threeMinuteTimestamp

      const istDate = convertToIST(currentTime)
      const totalSeconds = 180 - ((istDate.getMinutes() % 3) * 60 + istDate.getSeconds())
      const minutes = Math.floor(totalSeconds / 60)
      const seconds = totalSeconds % 60
      const timeRemainingString = `${minutes}m${seconds}s`

      seriesRef.current.applyOptions({
        lastValueVisible: true,
        priceFormat: {
          type: "price",
          precision: 2,
          minMove: 0.01,
        },
        title: timeRemainingString,
      })
    },
    [],
  )

  useEffect(() => {
    setIsMounted(true)
    return () => {
      if (chartRef.current) {
        chartRef.current.remove()
        chartRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (isMounted && chartContainerRef.current && !chartRef.current) {
      console.log("Creating new chart instance")
      
      // Get responsive dimensions
      const container = chartContainerRef.current
      const width = container.clientWidth || windowWidth - 32 // Account for padding
      const height = container.clientHeight || Math.min(400, window.innerHeight * 0.4) // Mobile-friendly height
      
      chartRef.current = createChart(container, {
        width,
        height,
        layout: {
          background: { type: ColorType.Solid, color: "white" },
          textColor: "black",
        },
        grid: {
          vertLines: { 
            color: "#e0e0e0", 
            style: LineStyle.Dashed,
            visible: windowWidth > 768 // Hide on mobile for cleaner look
          },
          horzLines: { 
            color: "#e0e0e0", 
            style: LineStyle.Dashed,
            visible: windowWidth > 768 // Hide on mobile for cleaner look
          },
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
          tickMarkFormatter: (time: UTCTimestamp) => formatTimeIST(time),
          // Mobile-specific time scale options
          rightOffset: windowWidth < 768 ? 5 : 12,
          barSpacing: windowWidth < 768 ? 4 : 6,
          minBarSpacing: windowWidth < 768 ? 0.5 : 1,
        },
        crosshair: {
          vertLine: {
            labelVisible: true,
            labelBackgroundColor: "rgba(46, 46, 46, 0.8)",
            width: windowWidth < 768 ? 1 : 2,
          },
          horzLine: {
            labelVisible: true,
            labelBackgroundColor: "rgba(46, 46, 46, 0.8)",
            width: windowWidth < 768 ? 1 : 2,
          },
        },
        localization: {
          timeFormatter: (timestamp: UTCTimestamp) => formatTimeIST(timestamp),
        },
        // Mobile-specific right price scale options
        rightPriceScale: {
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
          borderVisible: false,
          entireTextOnly: windowWidth < 768, // Show only full price labels on mobile
        },
        // Handle touch interactions better on mobile
        handleScroll: {
          mouseWheel: true,
          pressedMouseMove: true,
          horzTouchDrag: true,
          vertTouchDrag: true,
        },
        handleScale: {
          axisPressedMouseMove: true,
          mouseWheel: true,
          pinch: true,
        },
      })

      setIsInitialized(true)
      console.log("chart is initialised")
    }
  }, [isMounted])

  // Handle symbol changes and initial load
  useEffect(() => {
    if (isInitialized) {
      const symbol = currentTab === "call" ? atmCallSymbol : atmPutSymbol
      if (symbol && symbol !== currentSymbolRef.current) {
        console.log("Symbol changed, fetching new data:", symbol)
        fetchDataAndCreateSeries(symbol)
      }
    }
  }, [isInitialized, currentTab, atmCallSymbol, atmPutSymbol, fetchDataAndCreateSeries])

  // Handle watermark updates
  useEffect(() => {
    if (chartRef.current && isInitialized) {
      chartRef.current.applyOptions({
        watermark: {
          text: currentTab === "call" ? "Call Option" : "Put Option",
          visible: true,
          fontSize: windowWidth < 768 ? 18 : 24, // Smaller font on mobile
          horzAlign: "center",
          vertAlign: "center",
        },
      })
    }
  }, [currentTab, isInitialized])

  // Handle call price updates
  useEffect(() => {
    if (isInitialized && atmCallPrice && atmCallTt && currentTab === "call") {
      const lastProcessed = lastProcessedCallRef.current
      if (atmCallPrice !== lastProcessed.price || atmCallTt !== lastProcessed.tt) {
        updateChartData(atmCallSymbol, atmCallPrice, atmCallTt)
        lastProcessedCallRef.current = { price: atmCallPrice, tt: atmCallTt }
      }
    }
  }, [isInitialized, currentTab, atmCallPrice, atmCallTt, atmCallSymbol, updateChartData])

  // Handle put price updates
  useEffect(() => {
    if (isInitialized && atmPutPrice && atmPutTt && currentTab === "put") {
      const lastProcessed = lastProcessedPutRef.current
      if (atmPutPrice !== lastProcessed.price || atmPutTt !== lastProcessed.tt) {
        updateChartData(atmPutSymbol, atmPutPrice, atmPutTt)
        lastProcessedPutRef.current = { price: atmPutPrice, tt: atmPutTt }
      }
    }
  }, [isInitialized, currentTab, atmPutPrice, atmPutTt, atmPutSymbol, updateChartData])

  // Enhanced resize handler for mobile responsiveness
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        const container = chartContainerRef.current
        const width = container.clientWidth || windowWidth - 32
        const height = container.clientHeight || Math.min(400, window.innerHeight * 0.4)
        
        chartRef.current.applyOptions({
          width,
          height,
          // Update mobile-specific options on resize
          timeScale: {
            rightOffset: windowWidth < 768 ? 5 : 12,
            barSpacing: windowWidth < 768 ? 4 : 6,
            minBarSpacing: windowWidth < 768 ? 0.5 : 1,
          },
          grid: {
            vertLines: { 
              visible: windowWidth > 768 
            },
            horzLines: { 
              visible: windowWidth > 768 
            },
          },
          rightPriceScale: {
            entireTextOnly: windowWidth < 768,
          },
          watermark: {
            fontSize: windowWidth < 768 ? 18 : 24,
          },
        })
      }
    }

    window.addEventListener("resize", handleResize)
    // Call immediately to set initial mobile state
    handleResize()
    
    return () => window.removeEventListener("resize", handleResize)
  }, [isInitialized])

  return (
    <Card className="w-full h-full  border-none shadow-none rounded-none">
      <CardHeader className="p-2 md:p-4 border-none">
        <CardTitle className="flex justify-between items-center text-sm md:text-base">
          {/* You can add title content here if needed */}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 h-[calc(100%-3rem)] md:h-[calc(100%-5rem)]">
        <div 
          ref={chartContainerRef} 
          className="w-full h-full min-h-[300px] md:min-h-[400px]"
          style={{
            // Ensure minimum height on mobile
            minHeight: windowWidth < 768 ? '300px' : '400px'
          }}
        >
          {error ? (
            <div className="flex items-center justify-center w-full h-full">
              <p className="text-red-500 text-sm md:text-base px-4 text-center">{error}</p>
            </div>
          ) : !isInitialized ? (
            <div className="flex items-center justify-center w-full h-full">
              <p className="text-sm md:text-base px-4 text-center">
                Initializing chart... {currentTab === "call" ? atmCallSymbol : atmPutSymbol}
              </p>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}