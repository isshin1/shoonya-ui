import { toast } from "@/components/ui/use-toast"
import axios from 'axios';
let socket: WebSocket | null = null;
let updateDataCallback: ((message: any) => void) | null = null;

export  function initializeWebSocket() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket;
  }

  socket = new WebSocket('ws://localhost:8090/ws');

  socket.onopen = () => {
    sendMessage("frontend connected");
    console.log('WebSocket connection established');
    const response =  axios.post('http://localhost:8090/api/firstFetch', {
      method: 'POST', // Specify the request method
      headers: {
          'Content-Type': 'application/json' // Set the content type to JSON
      },
    });

  };

  socket.onmessage = (event) => {
    // console.log(event.data);
    const message = JSON.parse(event.data);
    // console.log('Received message:', message);
    if (typeof updateDataCallback === 'function') {
      updateDataCallback(message);
    } else {
      console.error('updateDataCallback is not a function');
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
    // Attempt to reconnect after 5 seconds
    setTimeout(initializeWebSocket, 5000);
  };

  socket.onerror = (error) => {
    console.error('WebSocket error:', error);
  };

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

export function setUpdateDataCallback(callback: (message: any) => void) {
  updateDataCallback = callback;
}
