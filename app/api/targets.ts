import { API_BASE_URL } from "@/utils/env"

export const updateTargets = async (t1: number, t2: number, t3: number) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/updateTargets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ t1, t2, t3 }),
    })
    if (!response.ok) {
      throw new Error("Failed to update targets")
    }
    return { success: true, message: "Your targets have been successfully updated." }
  } catch (error) {
    console.error("Error updating targets:", error)
    throw error
  }
}

