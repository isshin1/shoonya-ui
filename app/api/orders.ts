import axios from 'axios';
import { API_BASE_URL } from '@/utils/env';
export const fetchOpenOrders = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/openOrders`);
    return response.data;
  } catch (error) {
    console.error('Error fetching open orders:', error);
    throw error;
  }
};

export const cancelOrder = async (norenordno: string) => {
  console.log("cancelling order", norenordno);
  try {
    const response = await axios.post(`${API_BASE_URL}/api/cancelOrder/${norenordno}`);
    if (response.status === 200) {
      return response.data;
    } else {
      throw new Error('Failed to cancel order');
    }
  } catch (error) {
    console.error('Error cancelling order:', error);
    throw error;
  }
};

export const fetchOpenOrdersCallback = async (setOpenOrders: React.Dispatch<React.SetStateAction<any[]>>, setIsLoading: React.Dispatch<React.SetStateAction<any>>, toast: any) => {
  setIsLoading((prev: any) => ({ ...prev, openOrders: true }));
  try {
    const orders = await fetchOpenOrders();
    setOpenOrders(orders);
  } catch (error) {
    console.error('Error fetching open orders:', error);
    // toast({
    //   title: "Error",
    //   description: "Failed to fetch open orders. Please try again.",
    //   variant: "destructive",
    // });
  } finally {
    setIsLoading((prev: any) => ({ ...prev, openOrders: false }));
  }
};

export const handleCancelOrder = async (norenordno: string, fetchOpenOrdersCallback: () => void, toast: any) => {
  try {
    await cancelOrder(norenordno);
    toast({
      title: "Order Cancelled",
      description: `Order ${norenordno} has been successfully cancelled.`,
    });
    fetchOpenOrdersCallback(); // Refresh the open orders list
  } catch (error: any) {
    toast({
      title: "Error",
      description: error.message || "Failed to cancel order. Please try again.",
      variant: "destructive",
    });
  }
};

