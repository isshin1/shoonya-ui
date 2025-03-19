import { toast } from "@/components/ui/use-toast"
import axios from 'axios';
import { API_BASE_URL } from '@/utils/env';
import { WEBSOCKET_BASE_URL } from '@/utils/env';

let socket: WebSocket | null = null;
let updateDataCallback: ((message: any) => void) | null = null;

export function initializeWebSocket(callback: (message: any) => void) {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket;
  }

  socket = new WebSocket(`ws://${WEBSOCKET_BASE_URL}/ws`);

  socket.onopen = () => {
    sendMessage("frontend connected");
    console.log('WebSocket connection established, fetching new data');
    axios.post(`${API_BASE_URL}/api/firstFetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
    });
  };

  const singleQuoteRegex = /'/g;

  socket.onmessage = (event) => {
    // console.log(event.data)
    const message = JSON.parse(event.data.replace(singleQuoteRegex, '"'));
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

