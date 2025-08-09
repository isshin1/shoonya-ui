import { API_BASE_URL } from "@/utils/env"

export const updateTargets = (t1: number, t2: number) => {
  fetch(`${API_BASE_URL}/api/updateTargets`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ t1, t2 }),
  }).catch(error => {
    console.error("Error updating targets:", error)
  })
}