import { API_BASE_URL } from "@/utils/env"
import { fetchWithAuth } from "@/app/lib/api";

export const updateTargets = (t1: number, t2: number) => {
  fetchWithAuth(`${API_BASE_URL}/tradeapp/updateTargets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ t1, t2 }),
  }).catch(error => {
    console.error("Error updating targets:", error)
  })
}