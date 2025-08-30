
import { API_BASE_URL } from "@/utils/env"
import { fetchWithAuth } from "@/app/lib/api";

export const refreshTrade = async () => {
  try {
    const response = await fetchWithAuth(`${API_BASE_URL}/tradeapp/refreshTrade`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to refresh trade: ${response.status}`)
    }

    return { success: true, message: "Trade refreshed successfully" }
  } catch (error) {
    console.error("Error refreshing trade:", error)
    throw error
  }
}
