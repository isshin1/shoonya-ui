import axios from 'axios';

export async function fetchMargin(): Promise<number> {
  try {
    const response = await axios.get('http://localhost:8000/api/margin');
    console.log(`margin available is ${response}`)
    return response.data;
  } catch (error) {
    console.error('Error fetching margin:', error);
    throw error;
  }
}
