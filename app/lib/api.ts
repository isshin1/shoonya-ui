// src/lib/api.ts

import { TokensIcon } from "@radix-ui/react-icons";
import { toast } from "@/components/ui/use-toast"

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem('jwt');
  
  const headers = new Headers(options.headers || {});
  
  if (token) {
    headers.set('Authorization', `Bearer ${token}`); // Use set instead of append
  }
  
  console.log('Request options:', options);
  console.log('Request URL:', url);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    console.log('Response status:', response.status);
    
    if (response.status === 401) { // Unauthorized - token likely expired
      toast({
        title: "Error",
        description: "Unauthenticated Request, please login.",
        variant: "destructive",
      })
      console.log('Session expired, please log in again.'); // Fixed: console.log.error -> console.error
      // Uncomment these if you want auto-logout on 401
      localStorage.removeItem('jwt');
      // window.dispatchEvent(new Event("logout"));
    }
    
    return response;
  } catch (error) {
    console.error('Fetch error:', error);
    // toast.error('Network error occurred');
    throw error;
  }
}
