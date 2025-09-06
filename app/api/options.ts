import type React from "react"
import { toast } from "@/components/ui/use-toast"
import { API_BASE_URL } from "@/utils/env"
import { fetchWithAuth } from "@/app/lib/api";

// Explicitly type the response from the API
type OptionSymbols = {
  atmCall: string
  atmPut: string
}

type OptionPrices = {
  [symbol: string]: number
}

type OrderType = "SL" | "LIMIT" | "STOP_LOSS"

export async function fetchOptionSymbols(): Promise<OptionSymbols> {
  try {
    console.log("Fetching option symbols...")
    const response = await fetchWithAuth(`${API_BASE_URL}/tradeapp/atmSymbols`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    console.log("Fetched option symbols:", data)
    return data
  } catch (error) {
    console.error("Error fetching option symbols:", error)
    throw error
  }
}

export async function fetchOptionPrices(symbols: OptionSymbols): Promise<OptionPrices> {
  try {
    console.log("Fetching option prices for symbols:", symbols)
    const propertyName1 = "atmCall"
    const propertyName2 = "atmPut"
    const atmCall = symbols[propertyName1]
    const atmPut = symbols[propertyName2]
    // console.log(atmCall)
    // console.log(atmPut)
    const symbolsString = `${symbols.atmCall},${symbols.atmPut}`
    console.log("got symbols:", symbolsString)
    const response = await fetchWithAuth(`${API_BASE_URL}/tradeapp/atmPrice/${symbolsString}`)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    console.log("Fetched option prices:", data)
    return data
  } catch (error) {
    console.error("Error fetching option prices:", error)
    throw error
  }
}

export const buyOption = async (
  type: "fut" | "call" | "put",
  orderType: OrderType,
  price: number,
  token: string,
  bof: boolean,
  setIsLoading: (value: React.SetStateAction<{ [key: string]: boolean }>) => void,
): Promise<{ success: boolean; startTime?: number }> => {
  setIsLoading((prev) => ({ ...prev, buyOrder: true }))
  
  if ((orderType === "LIMIT" || orderType === "STOP_LOSS" || orderType === "SL") && !price) {
    toast({
      title: "Error",
      description: "Price cannot be empty for Limit or Stop Limit orders.",
      variant: "destructive",
    })
    setIsLoading((prev) => ({ ...prev, buyOrder: false }))
    return { success: false }
  }

  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/tradeapp/buyOrder/${token}/${orderType}/${price || 0}/${bof}`, {
      method: 'POST',
    })
    
    console.log(response.status)
    
    if (response.status === 200) {
      // toast({
      // title: "Order Placed",
      // description: `You have placed a ${orderType} ${type} order ${orderType !== 'MKT' ? `at ₹${price}` : ''}.`,
      // duration: 5000,
      // });
      return { success: true, startTime: Date.now() }
    } else if (response.status === 406) {
      const responseBody = await response.text()
      toast({
        title: "Not Allowed",
        description: `You have placed a buy order too soon. Wait for ${responseBody} minutes.`,
        duration: 5000,
      })
    }
  } catch (error: any) {
    console.log(error)
    
    // Handle fetchWithAuth errors differently since it doesn't have response.status structure like axios
    if (error.message?.includes('406') || error.status === 406) {
      // Try to extract the response body if available
      const errorMessage = error.response || error.message || "some"
      toast({
        title: "Not Allowed",
        description: `You have placed a buy order too soon. Wait for ${errorMessage} more minutes.`,
        duration: 5000,
      })
    } else {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    }
  } finally {
    setIsLoading((prev) => ({ ...prev, buyOrder: false }))
  }
  
  return { success: false }
}