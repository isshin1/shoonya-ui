import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts'
import { initializeWebSocket, closeWebSocket } from '../app/websocket/websocket'

type LineData = {
  time: number;
  value: number;
};

interface RealTimeChartProps {
  atmCallSymbol: string;
  atmPutSymbol: string;
  atmCallToken: number;
  atmPutToken: number;
  currentTab: 'call' | 'put';
}

export function RealTimeChart({ atmCallSymbol, atmPutSymbol, atmCallToken, atmPutToken, currentTab }: RealTimeChartProps) {
  const [interval, setInterval] = useState<'1m' | '3m'>('1m')
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const callSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const putSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  useEffect(() => {
    // const socket = initializeWebSocket();

    if (chartContainerRef.current && !chartRef.current) {
      chartRef.current = createChart(chartContainerRef.current, {
        width: chartContainerRef.current.clientWidth,
        height: 300,
        layout: {
          background: { type: ColorType.Solid, color: 'white' },
          textColor: 'black',
        },
        grid: {
          vertLines: { color: '#e0e0e0' },
          horzLines: { color: '#e0e0e0' },
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
        },
      });

      callSeriesRef.current = chartRef.current.addLineSeries({
        color: 'rgb(0, 120, 255)',
        lineWidth: 2,
        title: 'ATM Call',
      });

      putSeriesRef.current = chartRef.current.addLineSeries({
        color: 'rgb(255, 0, 0)',
        lineWidth: 2,
        title: 'ATM Put',
      });
    }

    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      if (data.type === 'price') {
        const newPoint: LineData = {
          time: Math.floor(Date.now() / 1000),
          value: data.price,
        };
        if (data.token === atmCallToken && callSeriesRef.current) {
          callSeriesRef.current.update(newPoint);
        } else if (data.token === atmPutToken && putSeriesRef.current) {
          putSeriesRef.current.update(newPoint);
        }
      }
    };

    // socket.addEventListener('message', handleMessage);

    // Update chart visibility based on currentTab
    if (chartRef.current && callSeriesRef.current && putSeriesRef.current) {
      if (currentTab === 'call') {
        callSeriesRef.current.applyOptions({ visible: true });
        putSeriesRef.current.applyOptions({ visible: false });
      } else {
        callSeriesRef.current.applyOptions({ visible: false });
        putSeriesRef.current.applyOptions({ visible: true });
      }
    }

    return () => {
      // socket.removeEventListener('message', handleMessage);
      // closeWebSocket();
    };
  }, [atmCallSymbol, atmPutSymbol, atmCallToken, atmPutToken, currentTab]);

  useEffect(() => {
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleIntervalChange = (newInterval: '1m' | '3m') => {
    setInterval(newInterval);
    // Here you would typically fetch new data for the changed interval
    // and update the chart accordingly
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex space-x-2">
          <Button
            variant={interval === '1m' ? 'default' : 'outline'}
            onClick={() => handleIntervalChange('1m')}
          >
            1m
          </Button>
          <Button
            variant={interval === '3m' ? 'default' : 'outline'}
            onClick={() => handleIntervalChange('3m')}
          >
            3m
          </Button>
        </div>
      </CardHeader>
      <CardContent className="h-[calc(100%-5rem)]">
        <div ref={chartContainerRef} className="w-full h-full" />
      </CardContent>
    </Card>
  )
}

