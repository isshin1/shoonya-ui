"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type UTCTimestamp,
  LineStyle,
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

interface ChartData {
  series: ISeriesApi<"Candlestick">
  currentCandle: CandlestickData
  lastUpdate: number
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

const isSignificantDeviation = (price: number, prevPrice: number, threshold = 0.1): boolean => {
  if (!prevPrice) return false
  const percentageChange = Math.abs((price - prevPrice) / prevPrice)
  return percentageChange > threshold
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
      if (!chartRef.current || isEmpty(symbol)) return

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

        // const dataIST = convertDataToIST(data)
        const dataIST = data
        setHistoricalData(dataIST)

        // Create new series
        const newSeries = createNewSeries(symbol)
        if (newSeries) {
          newSeries.setData(dataIST)
        }

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
        console.log("Missing data for update:", { price, timestamp, seriesExists: !!seriesRef.current })
        return
      }

      console.log("Updating chart data:", { symbol, price, timestamp })

      const currentTime = timestamp
      const threeMinuteTimestamp = (Math.floor(currentTime / (3 * 60)) * 3 * 60) as UTCTimestamp

      // Ensure we're not processing duplicate or old data
      if (threeMinuteTimestamp < lastUpdateRef.current) {
        console.log("Skipping update: Old or duplicate data", {
          newTimestamp: threeMinuteTimestamp,
          lastUpdate: lastUpdateRef.current,
        })
        // return
      }

      const lastCandle = historicalData[historicalData.length - 1]
      if(lastCandle){
        const oldTime =  lastCandle.time
        console.log("old and new rounded timestamps", {oldTime , threeMinuteTimestamp })
      }
      console.log("last candle is", {lastCandle})
      if (!lastCandle || threeMinuteTimestamp > lastCandle.time) {
        // Create a new candle
        console.log("Adding new candle:")
        const newCandle: CandlestickData = {
          time: threeMinuteTimestamp,
          open: price,
          high: price,
          low: price,
          close: price,
        }
        console.log("Adding new candle:", newCandle)
        seriesRef.current.update(newCandle)
        setHistoricalData((prev) => [...prev, newCandle])
      } else if (threeMinuteTimestamp === lastCandle.time) {
        // Update the existing candle
        console.log("updating same candle")
        const updatedCandle: CandlestickData = {
          time: lastCandle.time,
          open: lastCandle.open,
          high: Math.max(lastCandle.high, price),
          low: Math.min(lastCandle.low, price),
          close: price,
        }
        console.log("Updating existing candle:", updatedCandle)
        seriesRef.current.update(updatedCandle)
        setHistoricalData((prev) => [...prev.slice(0, -1), updatedCandle])
      }

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

      console.log("Chart update complete")
    },
    [historicalData],
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
        // console.log("Updating call data:", { atmCallSymbol, atmCallPrice, atmCallTt })
        updateChartData(atmCallSymbol, atmCallPrice, atmCallTt)
      }
    }
  }, [isInitialized, currentTab, atmCallPrice, atmCallTt, atmCallSymbol, updateChartData])

  useEffect(() => {
    if (isInitialized && atmPutPrice && atmPutTt) {
      if (currentTab === "put") {
        // console.log("Updating put data:", { atmPutSymbol, atmPutPrice, atmPutTt })
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
    <Card className="w-1000 h-full border-none shadow-none">
      <CardHeader className="p-4 border-none">
        <CardTitle className="flex justify-between items-center"></CardTitle>
      </CardHeader>
      <CardContent className="p-0 h-[calc(90%-5rem)]">
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

