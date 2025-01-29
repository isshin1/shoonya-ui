import React, { useEffect, useRef, useCallback, useState } from "react"
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type UTCTimestamp,
  LineStyle,
} from "lightweight-charts"
import { Card, CardContent } from "@/components/ui/card"
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

interface ChartData {
  series: ISeriesApi<"Candlestick">
  currentCandle: CandlestickData
  lastUpdate: number
}

const convertToIST = (timestamp: number): Date => {
  const date = new Date(timestamp * 1000)
  return new Date(date.getTime() + 5.5 * 60 * 60 * 0) // Add 5 hours and 30 minutes for IST
}

const formatTimeIST = (timestamp: UTCTimestamp): string => {
  const date = convertToIST(timestamp)
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

const isSignificantDeviation = (price: number, prevPrice: number, threshold = 0.1): boolean => {
  if (!prevPrice) return false
  const percentageChange = Math.abs((price - prevPrice) / prevPrice)
  return percentageChange > threshold
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
  const chartDataRef = useRef<ChartData | null>(null)
  const updateQueue = useRef<Map<string, { price: number; timestamp: number }>>(new Map())
  const animationFrameRef = useRef<number | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  const fetchDataAndCreateSeries = useCallback(
    async (symbol: string) => {
      if (!chartRef.current) return

      try {
        console.log(`Fetching historical data for ${symbol}...`)
        const data = await fetchHistoricalData(symbol)
        console.log(`Historical data fetched for ${symbol}:`, { dataLength: data.length })

        const convertDataToIST = (data: CandlestickData[]): CandlestickData[] => {
          return data.map((candle) => ({
            ...candle,
            time: (convertToIST(candle.time as number).getTime() / 1000) as UTCTimestamp,
          }))
        }

        const dataIST = convertDataToIST(data)

        if (chartDataRef.current?.series) {
          chartDataRef.current.series.setData(dataIST)
        } else {
          const series = chartRef.current.addCandlestickSeries({
            upColor: "#148564",
            downColor: "#DB542A",
            borderVisible: false,
            wickUpColor: "#148564",
            wickDownColor: "#DB542A",
            title: symbol.includes("C") ? "Call" : "Put",
            visible: true,
          })
          series.setData(dataIST)
          chartDataRef.current = {
            series,
            currentCandle: dataIST[dataIST.length - 1] || {
              time: 0 as UTCTimestamp,
              open: dataIST[dataIST.length - 1]?.close || 0,
              high: 0,
              low: 0,
              close: 0,
            },
            lastUpdate: Date.now(),
          }
        }

        console.log(`Chart series created and data set for ${symbol}`)
      } catch (error) {
        console.error(`Error initializing chart for ${symbol}:`, error)
        setError(`Failed to initialize chart data for ${symbol}`)
      }
    },
    [], // Removed unnecessary dependencies: chartRef, setError
  )

  const updateChartData = useCallback((symbol: string, price: number, timestamp: number) => {
    if (!price || !timestamp || !chartDataRef.current) return

    const { series, currentCandle } = chartDataRef.current
    const currentTime = timestamp
    const minuteTimestamp = (Math.floor(currentTime / 60) * 60) as UTCTimestamp

    // Check for significant deviation
    if (isSignificantDeviation(price, currentCandle.close)) {
      console.log(`Ignoring significant price deviation for ${symbol}: ${price}`)
      return
    }

    if (minuteTimestamp > currentCandle.time) {
      // Create new candle
      const newCandle: CandlestickData = {
        time: minuteTimestamp,
        open: currentCandle.close || price,
        high: price,
        low: price,
        close: price,
      }
      series.update(currentCandle) // Update the last candle one final time
      chartDataRef.current.currentCandle = newCandle
    } else {
      // Update existing candle
      currentCandle.high = Math.max(currentCandle.high, price)
      currentCandle.low = Math.min(currentCandle.low, price)
      currentCandle.close = price
    }

    const istDate = convertToIST(currentTime)
    const timeRemaining = 60 - istDate.getSeconds()

    series.applyOptions({
      lastValueVisible: true,
      priceFormat: {
        type: "price",
        precision: 2,
        minMove: 0.01,
      },
      title: `${timeRemaining}s`,
    })

    // Update the series
    series.update(chartDataRef.current.currentCandle)
    chartDataRef.current.lastUpdate = Date.now()
  }, [])

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
      chartRef.current = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
        layout: {
          background: { type: "solid", color: "white" },
          textColor: "black",
        },
        grid: {
          vertLines: { color: "#e0e0e0", style: LineStyle.Dashed },
          horzLines: { color: "#e0e0e0", style: LineStyle.Dashed },
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
          tickMarkFormatter: (time: UTCTimestamp) => formatTimeIST(time),
        },
        crosshair: {
          vertLine: {
            labelVisible: true,
            labelBackgroundColor: "rgba(46, 46, 46, 0.8)",
          },
          horzLine: {
            labelVisible: true,
            labelBackgroundColor: "rgba(46, 46, 46, 0.8)",
          },
        },
        localization: {
          timeFormatter: (timestamp: UTCTimestamp) => formatTimeIST(timestamp),
        },
      })
      setIsInitialized(true)
    }
  }, [isMounted])

  useEffect(() => {
    if (isInitialized) {
      const symbol = currentTab === "call" ? atmCallSymbol : atmPutSymbol
      fetchDataAndCreateSeries(symbol)

      // Clear existing series
      if (chartRef.current && chartDataRef.current) {
        chartRef.current.removeSeries(chartDataRef.current.series)
        chartDataRef.current = null
      }
    }
  }, [isInitialized, currentTab, atmCallSymbol, atmPutSymbol, fetchDataAndCreateSeries])

  useEffect(() => {
    if (isInitialized) {
      const symbol = currentTab === "call" ? atmCallSymbol : atmPutSymbol
      fetchDataAndCreateSeries(symbol)
    }
  }, [isInitialized, currentTab, atmCallSymbol, atmPutSymbol, fetchDataAndCreateSeries])

  useEffect(() => {
    if (chartRef.current && isInitialized) {
      chartRef.current.applyOptions({
        watermark: {
          text: currentTab === "call" ? "Call Option" : "Put Option",
          visible: true,
          fontSize: 24,
          horzAlign: "center",
          vertAlign: "center",
        },
      })
    }
  }, [currentTab, isInitialized])

  useEffect(() => {
    if (isInitialized && atmCallPrice && atmCallTt) {
      if (currentTab === "call") {
        updateChartData(atmCallSymbol, atmCallPrice, atmCallTt)
      }
    }
  }, [isInitialized, currentTab, atmCallPrice, atmCallTt, atmCallSymbol, updateChartData])

  useEffect(() => {
    if (isInitialized && atmPutPrice && atmPutTt) {
      if (currentTab === "put") {
        updateChartData(atmPutSymbol, atmPutPrice, atmPutTt)
      }
    }
  }, [isInitialized, currentTab, atmPutPrice, atmPutTt, atmPutSymbol, updateChartData])

  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        })
      }
    }

    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <Card className="w-1500 h-full">
      <CardContent className="p-0 h-full">
        <div ref={chartContainerRef} className="w-full h-full">
          {error ? (
            <div className="flex items-center justify-center w-full h-full">
              <p className="text-red-500">{error}</p>
            </div>
          ) : !isInitialized ? (
            <div className="flex items-center justify-center w-full h-full">
              <p>Initializing chart... {currentTab === "call" ? atmCallSymbol : atmPutSymbol}</p>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

