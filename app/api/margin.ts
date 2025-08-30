import axios from 'axios';
import { API_BASE_URL } from '@/utils/env';
import { fetchWithAuth } from "@/app/lib/api";

export async function fetchMargin(): Promise<number> {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/tradeapp/margin`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    // console.log(`margin available is ${data}`);
    return data;
  } catch (error) {
    console.error('Error fetching margin:', error);
    throw error;
  }
}