import React, { useEffect, useRef, useCallback, useState } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, UTCTimestamp, LineStyle } from 'lightweight-charts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchHistoricalData } from '@/app/api/chartData';
import { Resizable } from '@/components/resizable'

interface RealTimeChartWithTimeProps {
  atmCallSymbol: string;
  atmPutSymbol: string;
  currentTab: 'call' | 'put';
  atmCallPrice: number;
  atmPutPrice: number;
  atmCallTt: number;
  atmPutTt: number;
}

interface ChartData {
  [key: string]: {
    series: ISeriesApi<"Candlestick">;
    currentCandle: CandlestickData;
    priceLine: ReturnType<ISeriesApi<"Candlestick">['createPriceLine']> | null;
  };
}

const convertToIST = (timestamp: number): Date => {
  return new Date(timestamp * 1000);
};

const formatTimeIST = (date: Date): string => {
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Kolkata'
  });
};

export function RealTimeChart({ atmCallSymbol, atmPutSymbol, currentTab, atmCallPrice, atmPutPrice, atmCallTt, atmPutTt }: RealTimeChartWithTimeProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const chartDataRef = useRef<ChartData>({});
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
  //const [lastClosePrice, setLastClosePrice] = useState<{ [key: string]: number }>({});

  const updateChartData = useCallback((symbol: string, price: number, timestamp: number) => {
    if (chartDataRef.current[symbol]) {
      const { series, currentCandle } = chartDataRef.current[symbol];
      const currentTime = timestamp;
      const minuteTimestamp = Math.floor(currentTime / 60) * 60 as UTCTimestamp;

      if (minuteTimestamp > currentCandle.time) {
        // When creating a new candle, immediately use the last candle's close price
        const previousClose = currentCandle.close;
        
        // Update the current candle one final time before creating new one
        if (currentCandle.time !== 0) {
          series.update(currentCandle);
        }

        // Create new candle with previous close as open
        const newCandle: CandlestickData = {
          time: minuteTimestamp,
          open: previousClose, // Always use previous close as open
          high: price,
          low: price,
          close: price,
        };
        chartDataRef.current[symbol].currentCandle = newCandle;
      } else {
        // Update current candle while maintaining the original open price
        const originalOpen = currentCandle.open; // Preserve the original open
        currentCandle.high = Math.max(currentCandle.high, price);
        currentCandle.low = Math.min(currentCandle.low, price);
        currentCandle.close = price;
        currentCandle.open = originalOpen; // Ensure open price doesn't change
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

      // Update the series every second
      const currentUpdateTime = Date.now();
      if (currentUpdateTime - lastUpdateTime >= 1000) {
        series.update(chartDataRef.current[symbol].currentCandle);
        setLastUpdateTime(currentUpdateTime);
      }
    }
  }, [lastUpdateTime]);

  const handleResize = () => {
    if (chartRef.current && chartContainerRef.current) {
      chartRef.current.applyOptions({
        width: chartContainerRef.current.clientWidth,
        height: chartContainerRef.current.clientHeight,
      });
    }
  };

  useEffect(() => {
    if (chartContainerRef.current && !chartRef.current) {
      console.log('Creating chart');
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
          tickMarkFormatter: (time: UTCTimestamp) => {
            const date = new Date(time * 1000);
            return formatTimeIST(date);
          },
        },
        localization: {
          timeFormatter: (time: UTCTimestamp) => {
            const date = new Date(time * 1000);
            return formatTimeIST(date);
          },
        },
      });

      const initializeChart = async () => {
        const callData = await fetchHistoricalData(atmCallSymbol);
        const putData = await fetchHistoricalData(atmPutSymbol);

        const callSeries = chartRef.current!.addCandlestickSeries({
          upColor: '#148564',
          downColor: '#DB542A',
          borderVisible: false,
          wickUpColor: '#148564',
          wickDownColor: '#DB542A',
          title: 'Call',
          visible: currentTab === 'call'
        });

        const putSeries = chartRef.current!.addCandlestickSeries({
          upColor: '#148564',
          downColor: '#DB542A',
          borderVisible: false,
          wickUpColor: '#148564',
          wickDownColor: '#DB542A',
          title: 'Put',
          visible: currentTab === 'put'
        });

        callSeries.setData(callData);
        putSeries.setData(putData);

        //setLastClosePrice({
        //  [atmCallSymbol]: callData[callData.length - 1]?.close || callData[callData.length - 1]?.open || 0,
        //  [atmPutSymbol]: putData[putData.length - 1]?.close || putData[putData.length - 1]?.open || 0,
        //});

        chartDataRef.current = {
          [atmCallSymbol]: { 
            series: callSeries, 
            currentCandle: callData[callData.length - 1] || { 
              time: 0 as UTCTimestamp, 
              open: callData[callData.length - 1]?.close || 0,
              high: 0, 
              low: 0, 
              close: 0 
            }, 
          },
          [atmPutSymbol]: { 
            series: putSeries, 
            currentCandle: putData[putData.length - 1] || { 
              time: 0 as UTCTimestamp, 
              open: putData[putData.length - 1]?.close || 0,
              high: 0, 
              low: 0, 
              close: 0 
            }, 
          },
        };

        console.log('Chart and series created with historical data');
      };

      initializeChart();

      const handleResize = () => {
        if (chartRef.current && chartContainerRef.current) {
          chartRef.current.applyOptions({
            width: chartContainerRef.current.clientWidth,
            height: chartContainerRef.current.clientHeight,
          });
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (chartRef.current) {
          console.log('Removing chart');
          chartRef.current.remove();
          chartRef.current = null;
        }
      };
    }
  }, [atmCallSymbol, atmPutSymbol]);

  useEffect(() => {
    if (chartRef.current) {
      console.log('Updating series visibility');
      Object.entries(chartDataRef.current).forEach(([symbol, { series }]) => {
        const isVisible = (currentTab === 'call' && symbol === atmCallSymbol) || (currentTab === 'put' && symbol === atmPutSymbol);
        series.applyOptions({ visible: isVisible });
      });
    }
  }, [atmCallSymbol, atmPutSymbol, currentTab]);

  useEffect(() => {
    if (chartRef.current) {
      console.log('Updating chart data');
      updateChartData(atmCallSymbol, atmCallPrice, atmCallTt);
      updateChartData(atmPutSymbol, atmPutPrice, atmPutTt);
    }
  }, [atmCallPrice, atmPutPrice, atmCallTt, atmPutTt, updateChartData, atmCallSymbol, atmPutSymbol]);

  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }

    return () => {
      if (chartContainerRef.current) {
        resizeObserver.unobserve(chartContainerRef.current);
      }
    };
  }, []);

  return (
      <Card className="w-full h-full">
        <CardContent className="h-full">
          <div ref={chartContainerRef} className="w-full h-full" />
        </CardContent>
      </Card>
  );
}

function convertString(inputString: string) {
  const regex = /(NIFTY)(\d{2}[A-Z]{3}\d{2})(C|P)(\d+)/;
  const convertedString = inputString.replace(regex, (match, p1, p2, p3, p4) => {
      const ceOrPe = p3 === 'C' ? 'CE' : 'PE';
      return `${p1} ${p2} ${p4} ${ceOrPe}`;
  });
  return convertedString;
}

