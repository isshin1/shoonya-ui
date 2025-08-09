import axios from 'axios';
import { API_BASE_URL } from '@/utils/env';

export async function fetchMargin(): Promise<number> {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/margin`);
    console.log(`margin available is ${response}`)
    return response.data;
  } catch (error) {
    console.error('Error fetching margin:', error);
    throw error;
  }
}
