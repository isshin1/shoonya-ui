{/* Test click detection */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                console.log('=== DIAGNOSTIC INFO ===');
                console.log('Chart ref exists:', !!chartRef.current);
                console.log('Container ref exists:', !!chartContainerRef.current);
                console.log('Is initialized:', isInitialized);
                console.log('Drawing mode:', isDrawingMode);
                console.log('Drawing state:', drawingState);
                console.log('Series ref exists:', !!seriesRef.current);
                
                // Test if we can get time and price manually
                if (chartRef.current && seriesRef.current) {
                  console.log('=== MANUAL COORDINATE TEST ===');
                  try {
                    // Test center of chart
                    const container = chartContainerRef.current;
                    if (container) {
                      const rect = container.getBoundingClientRect();
                      const centerX = rect.width / 2;
                      const centerY = rect.height / 2;
                      
                      const timeScale = chartRef.current.timeScale();
                      const testTime = timeScale.coordinateToTime(centerX);
                      const testPrice = seriesRef.current.coordinateToPrice(centerY);
                      
                      console.log('Center coordinates test:', {
                        centerX, centerY, testTime, testPrice
                      });
                    }
                  } catch (error) {
                    console.error('Manual test failed:', error);
                  }
                }
              }}
              className="text-xs"
            >
              Diagnose
            </Button>

import { useEffect, useRef, useCallback, useState } from "react"
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type UTCTimestamp,
  LineStyle,
  ColorType,
  type MouseEventParams,
  type Time,
} from "lightweight-charts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Pencil, Eraser } from "lucide-react"
import { fetchHistoricalData } from "@/app/api/chartData"

interface RealTimeChartWithTimeProps {
  atmCallSymbol: string
  atmPutSymbol: string
  atmFutureSymbol: string
  currentTab: "fut" | "call" | "put"
  atmCallPrice: number
  atmPutPrice: number
  atmFuturePrice?: number
  atmCallTt: number
  atmPutTt: number
  atmFutureTt?: number
}

interface TrendLine {
  id: string
  series: ISeriesApi<"Line">
  startPoint: { time: Time; price: number }
  endPoint: { time: Time; price: number }
}

const convertToIST = (timestamp: number): Date => {
  const date = new Date(timestamp * 1000)
  return new Date(date.getTime() + 5.5 * 60 * 60 * 1000 * 0)
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
  atmFutureSymbol,
  currentTab,
  atmCallPrice,
  atmPutPrice,
  atmFuturePrice,
  atmCallTt,
  atmPutTt,
  atmFutureTt,
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

  // Drawing tool states
  const [isDrawingMode, setIsDrawingMode] = useState(false)
  const [trendLines, setTrendLines] = useState<TrendLine[]>([])
  const [drawingState, setDrawingState] = useState<{
    isDrawing: boolean
    startPoint: { time: Time; price: number } | null
  }>({
    isDrawing: false,
    startPoint: null
  })

  const lastProcessedCallRef = useRef<{ price: number; tt: number }>({ price: 0, tt: 0 })
  const lastProcessedPutRef = useRef<{ price: number; tt: number }>({ price: 0, tt: 0 })
  const lastProcessedFutureRef = useRef<{ price: number; tt: number }>({ price: 0, tt: 0 })

  useEffect(() => {
    setWindowWidth(window.innerWidth)
  }, [])

  // Create a trend line using line series (the supported workaround)
  const createTrendLine = useCallback((startPoint: { time: Time; price: number }, endPoint: { time: Time; price: number }) => {
    if (!chartRef.current) return null

    console.log('Creating trend line:', { startPoint, endPoint });

    // Create a line series for the trend line
    const lineSeries = chartRef.current.addLineSeries({
      color: '#FF6B6B',
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      crosshairMarkerVisible: false,
      lastValueVisible: false,
      priceLineVisible: false,
      title: 'Trend Line',
    })

    // Set data with exactly 2 points to create a straight line
    const lineData = [
      { time: startPoint.time, value: startPoint.price },
      { time: endPoint.time, value: endPoint.price },
    ]

    lineSeries.setData(lineData)

    const trendLine: TrendLine = {
      id: `trend-${Date.now()}`,
      series: lineSeries,
      startPoint,
      endPoint
    }

    return trendLine
  }, [])

  // Handle chart clicks for drawing
  const handleChartClick = useCallback((param: MouseEventParams) => {
    if (!isDrawingMode || !param.time || !param.point || !seriesRef.current) {
      return
    }

    console.log('Chart clicked in drawing mode:', param);

    // Convert screen coordinates to price
    const price = seriesRef.current.coordinateToPrice(param.point.y)
    if (price === null || price === undefined) {
      console.log('Could not get price from coordinates');
      return
    }

    console.log('Price at click:', price, 'Time:', param.time);

    if (!drawingState.isDrawing) {
      // Start drawing - set the first point
      setDrawingState({
        isDrawing: true,
        startPoint: { time: param.time, price }
      })
      console.log('Started drawing, first point set');
    } else if (drawingState.startPoint) {
      // Finish drawing - create the trend line
      const endPoint = { time: param.time, price }
      console.log('Finishing drawing, end point:', endPoint);

      const trendLine = createTrendLine(drawingState.startPoint, endPoint)
      if (trendLine) {
        setTrendLines(prev => [...prev, trendLine])
        console.log('Trend line created successfully');
      } else {
        console.log('Failed to create trend line');
      }

      // Reset drawing state
      setDrawingState({
        isDrawing: false,
        startPoint: null
      })
    }
  }, [isDrawingMode, drawingState, createTrendLine])

  // Clear all trend lines
  const clearAllTrendLines = useCallback(() => {
    console.log('Clearing all trend lines');
    trendLines.forEach(trendLine => {
      if (chartRef.current) {
        chartRef.current.removeSeries(trendLine.series)
      }
    })
    setTrendLines([])
    setDrawingState({ isDrawing: false, startPoint: null })
  }, [trendLines])

  // Toggle drawing mode
  const toggleDrawingMode = useCallback(() => {
    const newMode = !isDrawingMode
    console.log('Toggling drawing mode:', newMode);
    setIsDrawingMode(newMode)
    
    // Reset drawing state when turning off drawing mode
    if (!newMode) {
      setDrawingState({ isDrawing: false, startPoint: null })
    }
  }, [isDrawingMode])

  const createNewSeries = useCallback((symbol: string) => {
    if (!chartRef.current) return null

    if (seriesRef.current) {
      chartRef.current.removeSeries(seriesRef.current)
    }

    let title = "Unknown"
    let upColor = "#148564"
    let downColor = "#DB542A"
    
    if (symbol.includes("C") || symbol.toLowerCase().includes("call")) {
      title = "Call"
    } else if (symbol.includes("P") || symbol.toLowerCase().includes("put")) {
      title = "Put"
    } else if (symbol.toLowerCase().includes("fut") || currentTab === "fut") {
      title = "Future"
      upColor = "#2563eb"
      downColor = "#dc2626"
    }

    const newSeries = chartRef.current.addCandlestickSeries({
      upColor,
      downColor,
      borderVisible: false,
      wickUpColor: upColor,
      wickDownColor: downColor,
      title,
      visible: true,
    })

    seriesRef.current = newSeries
    return newSeries
  }, [currentTab])

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

        // Clear existing trend lines when switching symbols
        clearAllTrendLines()

        const newSeries = createNewSeries(symbol)
        if (newSeries) {
          newSeries.setData(data)
        }

        lastUpdateRef.current = 0
        lastProcessedCallRef.current = { price: 0, tt: 0 }
        lastProcessedPutRef.current = { price: 0, tt: 0 }
        lastProcessedFutureRef.current = { price: 0, tt: 0 }

        console.log(`Chart series created and data set for ${symbol}`)
      } catch (error) {
        console.error(`Error initializing chart for ${symbol}:`, error)
        setError(`Failed to initialize chart data for ${symbol}`)
      }
    },
    [createNewSeries, clearAllTrendLines],
  )

  const updateChartData = useCallback(
    (symbol: string, price: number, timestamp: number) => {
      if (!price || !timestamp || !seriesRef.current) {
        return
      }

      const currentTime = timestamp
      const threeMinuteTimestamp = (Math.floor(currentTime / (3 * 60)) * 3 * 60) as UTCTimestamp

      if (threeMinuteTimestamp < lastUpdateRef.current) {
        console.log("Skipping update: Old or duplicate data", {
          newTimestamp: threeMinuteTimestamp,
          lastUpdate: lastUpdateRef.current,
        })
        return
      }

      setHistoricalData(currentData => {
        const lastCandle = currentData[currentData.length - 1]

        if (!lastCandle || threeMinuteTimestamp > lastCandle.time) {
          console.log("Adding new candle")
          const newCandle: CandlestickData = {
            time: threeMinuteTimestamp,
            open: lastCandle.close,
            high: price,
            low: price,
            close: price,
          }
          seriesRef.current?.update(newCandle)
          return [...currentData, newCandle]
        } else if (threeMinuteTimestamp === lastCandle.time) {
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
      
      const container = chartContainerRef.current
      const width = container.clientWidth || windowWidth - 32
      const height = container.clientHeight || Math.min(400, window.innerHeight * 0.4)
      
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
            visible: windowWidth > 768
          },
          horzLines: { 
            color: "#e0e0e0", 
            style: LineStyle.Dashed,
            visible: windowWidth > 768
          },
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
          tickMarkFormatter: (time: UTCTimestamp) => formatTimeIST(time),
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
        rightPriceScale: {
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
          borderVisible: false,
          entireTextOnly: windowWidth < 768,
        },
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

      // Subscribe to click events for drawing functionality
      chartRef.current.subscribeClick(handleChartClick)

      setIsInitialized(true)
      console.log("Chart initialized with click handler")
    }
  }, [isMounted, handleChartClick, windowWidth])

  // Handle symbol changes and initial load
  useEffect(() => {
    if (isInitialized) {
      let symbol = ""
      if (currentTab === "call") {
        symbol = atmCallSymbol
      } else if (currentTab === "put") {
        symbol = atmPutSymbol
      } else if (currentTab === "fut") {
        symbol = atmFutureSymbol
      }
      
      if (symbol && symbol !== currentSymbolRef.current) {
        console.log("Symbol changed, fetching new data:", symbol)
        fetchDataAndCreateSeries(symbol)
      }
    }
  }, [isInitialized, currentTab, atmCallSymbol, atmPutSymbol, atmFutureSymbol, fetchDataAndCreateSeries])

  // Handle watermark updates
  useEffect(() => {
    if (chartRef.current && isInitialized) {
      let watermarkText = ""
      if (currentTab === "call") {
        watermarkText = "Call Option"
      } else if (currentTab === "put") {
        watermarkText = "Put Option"
      } else if (currentTab === "fut") {
        watermarkText = "Future"
      }
      
      chartRef.current.applyOptions({
        watermark: {
          text: watermarkText,
          visible: true,
          fontSize: windowWidth < 768 ? 18 : 24,
          horzAlign: "center",
          vertAlign: "center",
        },
      })
    }
  }, [currentTab, isInitialized, windowWidth])

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

  // Handle future price updates
  useEffect(() => {
    if (isInitialized && atmFuturePrice && atmFutureTt && currentTab === "fut") {
      const lastProcessed = lastProcessedFutureRef.current
      if (atmFuturePrice !== lastProcessed.price || atmFutureTt !== lastProcessed.tt) {
        updateChartData(atmFutureSymbol, atmFuturePrice, atmFutureTt)
        lastProcessedFutureRef.current = { price: atmFuturePrice, tt: atmFutureTt }
      }
    }
  }, [isInitialized, currentTab, atmFuturePrice, atmFutureTt, atmFutureSymbol, updateChartData])

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        const container = chartContainerRef.current
        const width = container.clientWidth || windowWidth - 32
        const height = container.clientHeight || Math.min(400, window.innerHeight * 0.4)
        
        chartRef.current.applyOptions({
          width,
          height,
          timeScale: {
            rightOffset: window.innerWidth < 768 ? 5 : 12,
            barSpacing: window.innerWidth < 768 ? 4 : 6,
            minBarSpacing: window.innerWidth < 768 ? 0.5 : 1,
          },
          grid: {
            vertLines: { 
              visible: window.innerWidth > 768 
            },
            horzLines: { 
              visible: window.innerWidth > 768 
            },
          },
          rightPriceScale: {
            entireTextOnly: window.innerWidth < 768,
          },
          watermark: {
            fontSize: window.innerWidth < 768 ? 18 : 24,
          },
        })
      }
    }

    window.addEventListener("resize", handleResize)
    handleResize()
    
    return () => window.removeEventListener("resize", handleResize)
  }, [isInitialized])

  const getCurrentSymbol = () => {
    if (currentTab === "call") return atmCallSymbol
    if (currentTab === "put") return atmPutSymbol
    if (currentTab === "fut") return atmFutureSymbol
    return ""
  }

  return (
    <Card className="w-full h-full border-none shadow-none rounded-none">
      <CardHeader className="p-2 md:p-4 border-none">
        <CardTitle className="flex justify-between items-center text-sm md:text-base">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Drawing Tools */}
            <Button
              variant={isDrawingMode ? "default" : "outline"}
              size="sm"
              onClick={toggleDrawingMode}
              className={`flex items-center gap-1 ${isDrawingMode ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
            >
              <Pencil className="w-4 h-4" />
              {windowWidth > 768 && "Draw Line"}
            </Button>
            
            {trendLines.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllTrendLines}
                className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Eraser className="w-4 h-4" />
                {windowWidth > 768 && "Clear Lines"}
              </Button>
            )}
            
            {isDrawingMode && (
              <div className="flex items-center gap-2">
                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border">
                  {drawingState.isDrawing ? "Click to set end point" : "Click to set start point"}
                </span>
                {trendLines.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {trendLines.length} line{trendLines.length !== 1 ? 's' : ''} drawn
                  </span>
                )}
              </div>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 h-[calc(100%-3rem)] md:h-[calc(100%-5rem)]">
        <div 
          ref={chartContainerRef} 
          className="w-full h-full min-h-[300px] md:min-h-[400px]"
          style={{
            minHeight: windowWidth < 768 ? '300px' : '400px',
            cursor: isDrawingMode ? 'crosshair' : 'default'
          }}
        >
          {error ? (
            <div className="flex items-center justify-center w-full h-full">
              <p className="text-red-500 text-sm md:text-base px-4 text-center">{error}</p>
            </div>
          ) : !isInitialized ? (
            <div className="flex items-center justify-center w-full h-full">
              <p className="text-sm md:text-base px-4 text-center">
                Initializing chart... {getCurrentSymbol()}
              </p>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}