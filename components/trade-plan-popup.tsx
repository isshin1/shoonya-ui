"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { API_BASE_URL } from "@/utils/env"
import { format, isToday } from "date-fns"
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export function TradePlanPopup() {
  const [isOpen, setIsOpen] = useState(false)
  const [tradePlan, setTradePlan] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [date, setDate] = useState<Date>(new Date())
  const popupRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // Fetch trade plan from API
  const fetchTradePlan = async () => {
    setIsLoading(true)
    try {
      const formattedDate = format(date, "yyyy-MM-dd")
      const response = await fetch(`${API_BASE_URL}/api/tradePlan?date=${formattedDate}`)
      if (!response.ok) {
        throw new Error("Failed to fetch trade plan")
      }
      const data = await response.json()
      setTradePlan(data.plan || "")
    } catch (error) {
      console.error("Error fetching trade plan:", error)
      toast({
        title: "Error",
        description: "Failed to fetch trade plan. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Update trade plan
  const updateTradePlan = async () => {
    setIsSaving(true)
    try {
      const formattedDate = format(date, "yyyy-MM-dd")
      const response = await fetch(`${API_BASE_URL}/api/tradePlan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: tradePlan,
          date: formattedDate,
        }),
      })
      if (!response.ok) {
        throw new Error("Failed to update trade plan")
      }
      toast({
        title: "Success",
        description: "Trade plan updated successfully.",
      })
      setIsOpen(false)
    } catch (error) {
      console.error("Error updating trade plan:", error)
      toast({
        title: "Error",
        description: "Failed to update trade plan. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Handle click outside to close popup
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Check if the click is inside the popup or inside any popover content (calendar)
      const target = event.target as Node
      const isInsidePopup = popupRef.current && popupRef.current.contains(target)
      const isInsidePopover = document.querySelector(".popover-content")?.contains(target)

      // Only close if the click is outside both the popup and any popover
      if (!isInsidePopup && !isInsidePopover) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      // Use a slight delay to ensure popover elements are in the DOM
      setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside)
      }, 100)
    } else {
      document.removeEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  // Fetch trade plan when popup is opened or date changes
  useEffect(() => {
    if (isOpen) {
      fetchTradePlan()
    }
  }, [isOpen, date])

  return (
    <>
      <Button variant="ghost" className="h-full px-3" onClick={() => setIsOpen(true)}>
        TradePlan
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div
            ref={popupRef}
            className="bg-white rounded-lg shadow-lg w-[500px] max-w-[90vw] max-h-[80vh] flex flex-col"
          >
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-semibold">Trade Plan</h2>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const prevDay = new Date(date)
                    prevDay.setDate(date.getDate() - 1)
                    setDate(prevDay)
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-[180px] justify-start text-left font-normal", !date && "text-muted-foreground")}
                    >
                      <CalendarIcon className={cn("mr-2 h-4 w-4", isToday(date) ? "text-green-500" : "")} />
                      {date ? format(date, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 popover-content" align="end">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={(newDate) => {
                        if (newDate) {
                          setDate(newDate)
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    const nextDay = new Date(date)
                    nextDay.setDate(date.getDate() + 1)
                    setDate(nextDay)
                  }}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="p-4 flex-grow overflow-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-[300px]">
                  <p>Loading trade plan...</p>
                </div>
              ) : (
                <Textarea
                  value={tradePlan}
                  onChange={(e) => setTradePlan(e.target.value)}
                  className="w-full h-[300px] resize-none"
                  placeholder="Enter your trade plan here..."
                />
              )}
            </div>
            <div className="p-4 border-t flex justify-end">
              <Button variant="outline" className="mr-2" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button onClick={updateTradePlan} disabled={isLoading || isSaving}>
                {isSaving ? "Updating..." : "Update"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

