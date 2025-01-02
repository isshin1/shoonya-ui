import axios from 'axios';

export interface Position {
  id: string;
  symbol: string;
  type: 'call' | 'put';
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  status: 'active' | 'closed';
}

export async function fetchPositions(): Promise<Position[]> {
  try {
    const response = await axios.get('http://localhost:8090/api/positions');
    return response.data;
  } catch (error) {
    console.error('Error fetching positions:', error);
    throw error;
  }
}

