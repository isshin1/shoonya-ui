import { API_BASE_URL } from "@/utils/env"

export const refreshTrade = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/refreshTrade`, {
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
