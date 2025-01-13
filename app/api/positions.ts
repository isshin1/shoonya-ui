import axios from 'axios';
import { API_BASE_URL } from '@/utils/env';
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
    const response = await axios.get(`${API_BASE_URL}/api/positions`);
    return response.data;
  } catch (error) {
    console.error('Error fetching positions:', error);
    throw error;
  }
}

