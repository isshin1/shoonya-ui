import axios from 'axios';
import { API_BASE_URL } from '@/utils/env';
interface CandleData {
  into: string;
  stat: string;
  ssboe: string;
  intvwap: string;
  intoi: string;
  intc: string;
  intv: string;
  v: string;
  inth: string;
  oi: string;
  time: string;
  intl: string;
}

interface ChartCandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export async function fetchHistoricalData(symbol: string): Promise<ChartCandleData[]> {
  try {
    console.log(`Fetching historical data for ${symbol}`);
    const response = await axios.get<CandleData[]>(`${API_BASE_URL}/api/fetchHistoricalData/${symbol}`);
    console.log('Raw historical data:', response.data);
    const chartData = convertBackendDataToChartData(response.data);
    console.log('Converted chart data:', chartData);
    return chartData;
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return [];
  }
}

function convertBackendDataToChartData(backendData: CandleData[]): ChartCandleData[] {
  return backendData.map(candle => {
    const time = parseInt(candle.ssboe, 10);
    const open = parseFloat(candle.into);
    const high = parseFloat(candle.inth);
    const low = parseFloat(candle.intl);
    const close = parseFloat(candle.intc);

    if (isNaN(time) || isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close)) {
      console.warn('Invalid candle data:', candle);
      return null;
    }

    return {
      time,
      open,
      high,
      low,
      close
    };
  }).filter((candle): candle is ChartCandleData => candle !== null);
}

