import { toast } from "@/components/ui/use-toast"
import axios from 'axios';
import { API_BASE_URL } from '@/utils/env';
import { WEBSOCKET_BASE_URL } from '@/utils/env';
import { fetchWithAuth } from '@/app/lib/api';

let socket: WebSocket | null = null;
let updateDataCallback: ((message: any) => void) | null = null;

export function initializeWebSocket(callback: (message: any) => void) {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    console.log("socket already opened or connecting")
    return socket;
  }

  socket = new WebSocket(`ws://${WEBSOCKET_BASE_URL}/ws`);

  socket.onopen = async () => {
    sendMessage("frontend connected");
    console.log('WebSocket connection established, fetching new data');
    
    try {
      const response = await fetchWithAuth(`${API_BASE_URL}/tradeapp/firstFetch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('First fetch successful:', data);
      } else {
        console.error('First fetch failed:', response.status);
      }
    } catch (error) {
      console.error('Error during first fetch:', error);
    }
  };

  const singleQuoteRegex = /'/g;
  
  socket.onmessage = (event) => {
    // console.log(` event is ${event.data}`)
    const message = JSON.parse(event.data)
    // const message = JSON.parse(event.data.replace(singleQuoteRegex, '"'));
    
    // Log future data specifically for debugging
    if (message.type === 'fut') {
      console.log('Received future data:', {
        type: message.type,
        token: message.token,
        symbol: message.tsym
      });
    }
    
    if (typeof callback === 'function') {
      callback(message);
    }
    
    if (message.type === 'toast') {
      toast({
        title: message.title,
        description: message.description,
        variant: message.variant || 'default',
        duration: message.duration || 3000,
      });
    }
  };

  socket.onclose = () => {
    console.log('WebSocket connection closed');
    socket = null;
    setTimeout(() => initializeWebSocket(callback), 1000);
  };

  socket.onerror = (error) => {
    console.log('WebSocket error:', error);
    socket = null;
    setTimeout(() => initializeWebSocket(callback), 1000);
  };

  updateDataCallback = callback;
  return socket;
}

export function closeWebSocket() {
  if (socket) {
    socket.close();
    socket = null;
  }
}

export function sendMessage(message: string | object) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(typeof message === 'string' ? message : JSON.stringify(message));
  } else {
    console.error('WebSocket is not connected');
  }
}

export function subscribeToRealTimeData(symbol: string) {
  sendMessage({ type: 'subscribe', symbol });
}

export function unsubscribeFromRealTimeData(symbol: string) {
  sendMessage({ type: 'unsubscribe', symbol });
}

// Optional: Add specific future-related functions
export function subscribeToFutureData(futureSymbol: string) {
  sendMessage({ type: 'subscribe_future', symbol: futureSymbol });
}

export function unsubscribeFromFutureData(futureSymbol: string) {
  sendMessage({ type: 'unsubscribe_future', symbol: futureSymbol });
}

export function requestFutureData() {
  sendMessage({ type: 'request_future_data' });
}