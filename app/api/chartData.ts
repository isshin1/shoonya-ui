import axios from 'axios';

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
    console.log(`fetching historical data for ${symbol}`)
    const response = await axios.get<CandleData[]>(`http://localhost:8090/api/test/${symbol}`);
    // const response = await axios.get<CandleData[]>(`http://localhost:8090/api/test`);
    console.log(response.data);
    return convertBackendDataToChartData(response.data);
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return [];
  }
}

function convertBackendDataToChartData(backendData: CandleData[]): ChartCandleData[] {
  return backendData.map(candle => ({
    time: parseInt(candle.ssboe, 10), // Use ssboe as it's already in Unix timestamp format
    open: parseFloat(candle.into),
    high: parseFloat(candle.inth),
    low: parseFloat(candle.intl),
    close: parseFloat(candle.intc)
  })).filter(candle => 
    !isNaN(candle.time) && 
    !isNaN(candle.open) && 
    !isNaN(candle.high) && 
    !isNaN(candle.low) && 
    !isNaN(candle.close)
  );
}

