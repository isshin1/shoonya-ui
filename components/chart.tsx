import React, { useEffect, useRef, useCallback, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, UTCTimestamp, LineStyle } from 'lightweight-charts';
import { Card, CardContent } from '@/components/ui/card';
import { fetchHistoricalData } from '@/app/api/chartData';

interface RealTimeChartWithTimeProps {
  atmCallSymbol: string;
  atmPutSymbol: string;
  currentTab: 'call' | 'put';
  atmCallPrice: number;
  atmPutPrice: number;
  atmCallTt: number;
  atmPutTt: number;
  onError?: (error: string) => void;
}

interface ChartData {
  [key: string]: {
    series: ISeriesApi<"Candlestick">;
    currentCandle: CandlestickData;
    lastUpdate: number;
  };
}

const convertToIST = (timestamp: number): Date => {
  const date = new Date(timestamp * 1000);
  return new Date(date.getTime() + (5.5 * 60 * 60 * 0)); // Add 5 hours and 30 minutes for IST
};

const formatTimeIST = (timestamp: UTCTimestamp): string => {
  const date = convertToIST(timestamp);
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
};

export function RealTimeChart({ 
  atmCallSymbol, 
  atmPutSymbol, 
  currentTab, 
  atmCallPrice, 
  atmPutPrice, 
  atmCallTt, 
  atmPutTt,
  onError 
}: RealTimeChartWithTimeProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const chartDataRef = useRef<ChartData>({});
  const updateQueue = useRef<Map<string, { price: number; timestamp: number }>>(new Map());
  const animationFrameRef = useRef<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const processUpdateQueue = useCallback(() => {
    updateQueue.current.forEach((data, symbol) => {
      if (chartDataRef.current[symbol]) {
        const { series, currentCandle } = chartDataRef.current[symbol];
        const currentTime = data.timestamp;
        const minuteTimestamp = Math.floor(currentTime / 60) * 60 as UTCTimestamp;

        if (minuteTimestamp > currentCandle.time) {
          // Create new candle
          const newCandle: CandlestickData = {
            time: minuteTimestamp,
            open: currentCandle.close || data.price,
            high: data.price,
            low: data.price,
            close: data.price,
          };
          series.update(currentCandle); // Update the last candle one final time
          chartDataRef.current[symbol].currentCandle = newCandle;
        } else {
          // Update existing candle
          currentCandle.high = Math.max(currentCandle.high, data.price);
          currentCandle.low = Math.min(currentCandle.low, data.price);
          currentCandle.close = data.price;
        }

        const istDate = convertToIST(currentTime);
        const timeRemaining = 60 - istDate.getSeconds();

        series.applyOptions({
          lastValueVisible: true,
          priceFormat: {
            type: 'price',
            precision: 2,
            minMove: 0.01,
          },
          title: `${timeRemaining}s`,
        });

        // Update the series
        series.update(chartDataRef.current[symbol].currentCandle);
        chartDataRef.current[symbol].lastUpdate = Date.now();
      }
    });

    updateQueue.current.clear();
    animationFrameRef.current = requestAnimationFrame(processUpdateQueue);
  }, []);

  const updateChartData = useCallback((symbol: string, price: number, timestamp: number) => {
    if (!price || !timestamp) return;
    
    updateQueue.current.set(symbol, { price, timestamp });
  }, []);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(processUpdateQueue);
    
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [processUpdateQueue]);

  const initializeChart = useCallback(async () => {
    console.log('Initializing chart...');
    console.log('isMounted:', isMounted);
    console.log('chartContainerRef.current:', !!chartContainerRef.current);
    
    if (!isMounted || !chartContainerRef.current) {
      console.log('Component not mounted or chart container not available yet');
      return;
    }

    if (!chartRef.current) {
      console.log('Creating new chart instance');
      chartRef.current = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
        layout: {
          background: { type: 'solid', color: 'white' },
          textColor: 'black',
        },
        grid: {
          vertLines: { color: '#e0e0e0', style: LineStyle.Dashed },
          horzLines: { color: '#e0e0e0', style: LineStyle.Dashed },
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
          tickMarkFormatter: (time: UTCTimestamp) => formatTimeIST(time),
        },
        crosshair: {
          vertLine: {
            labelVisible: true,
            labelBackgroundColor: 'rgba(46, 46, 46, 0.8)',
          },
          horzLine: {
            labelVisible: true,
            labelBackgroundColor: 'rgba(46, 46, 46, 0.8)',
          },
        },
        localization: {
          timeFormatter: (timestamp: UTCTimestamp) => formatTimeIST(timestamp),
        },
      });
    }

    if (!atmCallSymbol || !atmPutSymbol) {
      console.log('Waiting for valid symbols...');
      return;
    }

    try {
      console.log('Fetching historical data...');
      const [callData, putData] = await Promise.all([
        fetchHistoricalData(atmCallSymbol),
        fetchHistoricalData(atmPutSymbol)
      ]);
      console.log('Historical data fetched:', { callDataLength: callData.length, putDataLength: putData.length });

      // Convert timestamps to IST
      const convertDataToIST = (data: CandlestickData[]): CandlestickData[] => {
        return data.map(candle => ({
          ...candle,
          time: (convertToIST(candle.time as number).getTime() / 1000) as UTCTimestamp
        }));
      };

      const callDataIST = convertDataToIST(callData);
      const putDataIST = convertDataToIST(putData);

      const callSeries = chartRef.current.addCandlestickSeries({
        upColor: '#148564',
        downColor: '#DB542A',
        borderVisible: false,
        wickUpColor: '#148564',
        wickDownColor: '#DB542A',
        title: 'Call',
        visible: currentTab === 'call'
      });

      const putSeries = chartRef.current.addCandlestickSeries({
        upColor: '#148564',
        downColor: '#DB542A',
        borderVisible: false,
        wickUpColor: '#148564',
        wickDownColor: '#DB542A',
        title: 'Put',
        visible: currentTab === 'put'
      });

      callSeries.setData(callDataIST);
      putSeries.setData(putDataIST);

      chartDataRef.current = {
        [atmCallSymbol]: {
          series: callSeries,
          currentCandle: callDataIST[callDataIST.length - 1] || {
            time: 0 as UTCTimestamp,
            open: callDataIST[callDataIST.length - 1]?.close || 0,
            high: 0,
            low: 0,
            close: 0
          },
          lastUpdate: Date.now()
        },
        [atmPutSymbol]: {
          series: putSeries,
          currentCandle: putDataIST[putDataIST.length - 1] || {
            time: 0 as UTCTimestamp,
            open: putDataIST[putDataIST.length - 1]?.close || 0,
            high: 0,
            low: 0,
            close: 0
          },
          lastUpdate: Date.now()
        }
      };

      setIsInitialized(true);
      console.log('Chart initialized successfully');
    } catch (error) {
      console.error('Error initializing chart:', error);
      setError('Failed to initialize chart data');
      onError?.('Failed to initialize chart data');
    }
  }, [atmCallSymbol, atmPutSymbol, currentTab, onError, isMounted]);

  useEffect(() => {
    setIsMounted(true);
    return () => {
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isMounted && !isInitialized) {
      initializeChart();
    }
  }, [isMounted, isInitialized, initializeChart]);

  useEffect(() => {
    if (chartRef.current && isInitialized) {
      Object.entries(chartDataRef.current).forEach(([symbol, { series }]) => {
        const isVisible = (currentTab === 'call' && symbol === atmCallSymbol) || 
                         (currentTab === 'put' && symbol === atmPutSymbol);
        series.applyOptions({ visible: isVisible });
      });
      chartRef.current.applyOptions({
        watermark: {
          text: currentTab === 'call' ? 'Call Option' : 'Put Option',
          visible: true,
          fontSize: 24,
          horzAlign: 'center',
          vertAlign: 'center',
        },
      });
    }
  }, [atmCallSymbol, atmPutSymbol, currentTab, isInitialized]);

  // Update both call and put data independently
  useEffect(() => {
    if (isInitialized && atmCallPrice && atmCallTt) {
      updateChartData(atmCallSymbol, atmCallPrice, atmCallTt);
    }
  }, [isInitialized, atmCallPrice, atmCallTt, atmCallSymbol, updateChartData]);

  useEffect(() => {
    if (isInitialized && atmPutPrice && atmPutTt) {
      updateChartData(atmPutSymbol, atmPutPrice, atmPutTt);
    }
  }, [isInitialized, atmPutPrice, atmPutTt, atmPutSymbol, updateChartData]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
              <p>Initializing chart... {atmCallSymbol ? `Call: ${atmCallSymbol}` : 'Waiting for Call symbol'}, {atmPutSymbol ? `Put: ${atmPutSymbol}` : 'Waiting for Put symbol'}</p>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

