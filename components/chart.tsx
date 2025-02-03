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
import { Button } from "@/components/ui/button"
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

function aggregateToThreeMinutes2(data: CandlestickData[]) {
  const result = []

  for (let i = 0; i < data.length; i += 3) {
    const open = data[i].open
    const high = Math.max(
      data[i].high,
      data[i + 1]?.high || Number.NEGATIVE_INFINITY,
      data[i + 2]?.high || Number.NEGATIVE_INFINITY,
    )
    const low = Math.min(
      data[i].low,
      data[i + 1]?.low || Number.POSITIVE_INFINITY,
      data[i + 2]?.low || Number.POSITIVE_INFINITY,
    )
    const close = data[i + 2]?.close || data[i + 1]?.close || data[i].close
    const time = data[i]?.time || data[i + 1]?.time || data[i + 2].time

    result.push({ open, high, low, close, time })
  }

  return result
}

function aggregateToThreeMinutes(data: CandlestickData[]) {
  const threeMinuteCandles = []

  try {
    for (let i = 0; i < data.length; i += 3) {
      const batch = data.slice(i, i + 3)

      const open = batch[0].open
      const close = batch[batch.length - 1].close
      const high = Math.max(...batch.map((candle) => candle.high))
      const low = Math.min(...batch.map((candle) => candle.low))
      // const volume = batch.reduce((acc, candle) => acc + candle.volume, 0);

      const threeMinuteCandle = {
        open: open,
        close: close,
        high: high,
        low: low,
        // volume: volume,
        time: batch[0].time, // Start time of the first candle in the batch
      }

      threeMinuteCandles.push(threeMinuteCandle)
    }
  } catch (error) {
    console.error(`Error manufacturing 3m data:`, error)
  }

  return threeMinuteCandles
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
  const chartDataRef = useRef<ChartData | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [timeframe, setTimeframe] = useState<"1m" | "3m">("3m") // Update: Default timeframe to "3m"
  const [historicalData, setHistoricalData] = useState<CandlestickData[]>([])

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

        const dataIST = convertDataToIST(data)
        setHistoricalData(dataIST)

        const seriesData = timeframe === "3m" ? aggregateToThreeMinutes(dataIST) : dataIST

        if (chartDataRef.current?.series) {
          chartDataRef.current.series.setData(seriesData)
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
          series.setData(seriesData)
          chartDataRef.current = {
            series,
            currentCandle: seriesData[seriesData.length - 1] || {
              time: 0 as UTCTimestamp,
              open: seriesData[seriesData.length - 1]?.close || 0,
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
    [timeframe],
  )

  const updateChartData = useCallback(
    (symbol: string, price: number, timestamp: number) => {
      if (!price || !timestamp || !chartDataRef.current) return

      const { series, currentCandle } = chartDataRef.current
      const currentTime = timestamp
      const minuteTimestamp = (Math.floor(currentTime / 60) * 60) as UTCTimestamp

      // Check for significant deviation
      if (isSignificantDeviation(price, currentCandle.close)) {
        console.log(`Ignoring significant price deviation for ${symbol}: ${price}`)
        return
      }

      const shouldCreateNewCandle =
        timeframe === "1m"
          ? minuteTimestamp > currentCandle.time
          : Math.floor(minuteTimestamp / (3 * 60)) > Math.floor((currentCandle.time as number) / (3 * 60))

      if (shouldCreateNewCandle) {
        // Create new candle
        const newCandle: CandlestickData = {
          time:
            timeframe === "1m" ? minuteTimestamp : ((Math.floor(minuteTimestamp / (3 * 60)) * 3 * 60) as UTCTimestamp),
          open: currentCandle.close, // Use the previous candle's close as the new candle's open
          high: price,
          low: price,
          close: price,
        }
        series.update(currentCandle) // Update the last candle one final time
        chartDataRef.current.currentCandle = newCandle

        // Update historical data
        setHistoricalData((prevData) => [...prevData, newCandle])

        if (timeframe === "3m") {
          try {
            const lastThreeCandles = historicalData.slice(-3)
            const aggregatedCandle = aggregateToThreeMinutes([...lastThreeCandles, newCandle])[0]
            series.update(aggregatedCandle)
          } catch (error) {
            console.error(error)
          }
        } else {
          series.update(newCandle)
        }
      } else {
        // Update existing candle
        currentCandle.high = Math.max(currentCandle.high, price)
        currentCandle.low = Math.min(currentCandle.low, price)
        currentCandle.close = price

        if (timeframe === "3m") {
          try {
            const lastThreeCandles = historicalData.slice(-3)
            const updatedAggregatedCandle = aggregateToThreeMinutes([...lastThreeCandles.slice(0, 2), currentCandle])[0]
            series.update(updatedAggregatedCandle)
          } catch (error) {
            console.log(`unable to update candle ${error}`)
          }
        } else {
          series.update(currentCandle)
        }
      }

      const istDate = convertToIST(currentTime)
      let timeRemainingString: string

      if (timeframe === "1m") {
        const totalSeconds = 60 - istDate.getSeconds()
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60
        timeRemainingString = minutes > 0 ? `${minutes}m${seconds}s` : `${seconds}s`
      } else if (timeframe === "3m") {
        // 3m timeframe
        const totalSeconds = 180 - ((istDate.getMinutes() % 3) * 60 + istDate.getSeconds())
        const minutes = Math.floor(totalSeconds / 60)
        const seconds = totalSeconds % 60
        timeRemainingString = minutes > 0 ? `${minutes}m${seconds}s` : `${seconds}s`
      }

      series.applyOptions({
        lastValueVisible: true,
        priceFormat: {
          type: "price",
          precision: 2,
          minMove: 0.01,
        },
        title: timeRemainingString,
      })

      chartDataRef.current.lastUpdate = Date.now()
    },
    [timeframe, historicalData],
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

      // Clear existing series
      if (chartRef.current && chartDataRef.current) {
        chartRef.current.removeSeries(chartDataRef.current.series)
        chartDataRef.current = null
      }
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

  const handleTimeframeChange = (newTimeframe: "1m" | "3m") => {
    setTimeframe(newTimeframe)
    if (chartDataRef.current) {
      const newData = newTimeframe === "3m" ? aggregateToThreeMinutes(historicalData) : historicalData
      chartDataRef.current.series.setData(newData)
    }
  }

  const convertString = (str: string) => {
    return str.replace(/[^a-zA-Z0-9]/g, "")
  }

  return (
    <Card className="w-1000 h-full border-none shadow-none">
      <CardHeader className="p-4 border-none">
        <CardTitle className="flex justify-between items-center">
          {/* <span>{currentTab === "call" ? convertString(atmCallSymbol) : convertString(atmPutSymbol)}</span> */}
          <div className="space-x-2">
            <Button variant={timeframe === "1m" ? "default" : "outline"} onClick={() => handleTimeframeChange("1m")}>
              1m
            </Button>
            <Button variant={timeframe === "3m" ? "default" : "outline"} onClick={() => handleTimeframeChange("3m")}>
              3m
            </Button>
          </div>
        </CardTitle>
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

