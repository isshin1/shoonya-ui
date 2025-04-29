"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { API_BASE_URL } from "@/utils/env"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { DotsVerticalIcon } from "@radix-ui/react-icons"
import { Tile, TileHeader, TileTitle, TileContent } from "@/components/ui/tile"
import { cn } from "@/lib/utils"

// Update the type to match the actual API response
type PriceData = {
  id?: string
  name: string
  price: string | number
  call: boolean | number
  put: boolean | number
}

export function PriceTable() {
  const [tableData, setTableData] = useState<PriceData[]>([])
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingRow, setEditingRow] = useState<{ index: number; newPrice: string } | null>(null)
  const { toast } = useToast()

  const fetchPriceData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      console.log("Fetching from:", `${API_BASE_URL}/api/getDps`)
      const response = await fetch(`${API_BASE_URL}/api/getDps`)
      console.log("Response status:", response.status)

      if (!response.ok) {
        throw new Error(`Failed to fetch price data: ${response.status}`)
      }

      const text = await response.text()
      console.log("Raw response:", text)

      // Check if the response is a valid JSON string
      try {
        // Try to parse as JSON
        const data = JSON.parse(text)
        console.log("Parsed data:", data)

        if (Array.isArray(data)) {
          console.log("Setting table data with array of length:", data.length)
          setTableData(data)
        } else if (data && typeof data === "object") {
          // If it's an object with a data property that's an array
          if (Array.isArray(data.data)) {
            console.log("Using data.data array instead")
            setTableData(data.data)
          } else {
            // If we have data but it's not in the expected format, try to display it anyway
            console.log("Converting object to array")
            setTableData([data])
          }
        } else {
          setError("API returned unexpected data format")
          setTableData([])
        }
      } catch (parseError) {
        console.error("JSON parse error:", parseError)

        // If it's not valid JSON, check if it's a string representation of an array
        if (text.trim().startsWith("[") && text.trim().endsWith("]")) {
          // It looks like an array string, but JSON.parse failed
          setError(`Invalid JSON array: ${parseError.message}`)
        } else {
          // It's just a plain string, try to display it as a message
          setError(`API returned a string: ${text}`)

          // Try to manually parse the string if it looks like it might contain data
          if (text.includes("{") && text.includes("}")) {
            try {
              // Extract objects from the string
              const extractedObjects = text.match(/\{[^{}]*\}/g)
              if (extractedObjects && extractedObjects.length > 0) {
                const parsedObjects = extractedObjects
                  .map((obj) => {
                    try {
                      return JSON.parse(obj)
                    } catch (e) {
                      return null
                    }
                  })
                  .filter(Boolean)

                if (parsedObjects.length > 0) {
                  console.log("Extracted objects from string:", parsedObjects)
                  setTableData(parsedObjects)
                }
              }
            } catch (e) {
              console.error("Failed to extract objects from string:", e)
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching price data:", error)
      setError(`Failed to fetch price data: ${error.message}`)
      toast({
        title: "Error",
        description: `Failed to fetch price data: ${error.message}`,
        variant: "destructive",
      })
      setTableData([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdate = async () => {
    if (!name.trim() || !price.trim()) {
      toast({
        title: "Error",
        description: "Name and price are required.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/addDp/${price}/${name}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error("Failed to update price")
      }

      toast({
        title: "Success",
        description: "Price updated successfully.",
      })

      // Clear input fields
      setName("")
      setPrice("")

      // Refresh data
      fetchPriceData()
    } catch (error) {
      console.error("Error updating price:", error)
      toast({
        title: "Error",
        description: "Failed to update price. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteDp = async (name: string, price: string | number) => {
    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/deleteDp/${name}/${price}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete price point")
      }

      toast({
        title: "Success",
        description: "Price point deleted successfully.",
      })

      // Refresh data
      fetchPriceData()
    } catch (error) {
      console.error("Error deleting price point:", error)
      toast({
        title: "Error",
        description: "Failed to delete price point. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEditDp = (index: number) => {
    const item = tableData[index]
    setEditingRow({
      index,
      newPrice: item.price.toString(),
    })
  }

  const handleUpdateDp = async (name: string, oldPrice: string | number, newPrice: string) => {
    if (!newPrice.trim()) {
      toast({
        title: "Error",
        description: "New price cannot be empty.",
        variant: "destructive",
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/updateDp/${oldPrice}/${newPrice}`, {
        method: "PUT",
      })

      if (!response.ok) {
        throw new Error("Failed to update price point")
      }

      toast({
        title: "Success",
        description: "Price point updated successfully.",
      })

      // Reset editing state
      setEditingRow(null)

      // Refresh data
      fetchPriceData()
    } catch (error) {
      console.error("Error updating price point:", error)
      toast({
        title: "Error",
        description: "Failed to update price point. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Check if API_BASE_URL is defined
    if (!API_BASE_URL) {
      console.error("API_BASE_URL is not defined")
      setError("API base URL is not configured properly")
      toast({
        title: "Configuration Error",
        description: "API base URL is not configured properly.",
        variant: "destructive",
      })
      return
    }

    // Fetch data initially
    fetchPriceData()

    // Set up interval to fetch data every minute
    const intervalId = setInterval(fetchPriceData, 60 * 1000)

    // Clean up interval on component unmount
    return () => clearInterval(intervalId)
  }, [])

  // Helper function to format values for display
  const formatValue = (value: any): string => {
    if (typeof value === "number") {
      return value.toFixed(2)
    } else if (typeof value === "boolean") {
      return value ? "Yes" : "No"
    } else if (value === null || value === undefined) {
      return "N/A"
    }
    return String(value)
  }

  return (
    <Tile>
      <TileHeader>
        <TileTitle>Price Points</TileTitle>
      </TileHeader>
      <TileContent>
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p className="font-bold">Error:</p>
            <p>{error}</p>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Name
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Price
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Call
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Put
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tableData.length > 0 ? (
                tableData.map((item, index) => (
                  <tr key={item.id || index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.name || "N/A"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {editingRow && editingRow.index === index ? (
                        <input
                          type="text"
                          value={editingRow.newPrice}
                          onChange={(e) => setEditingRow({ ...editingRow, newPrice: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleUpdateDp(item.name, item.price, editingRow.newPrice)
                            } else if (e.key === "Escape") {
                              setEditingRow(null)
                            }
                          }}
                          autoFocus
                          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                        />
                      ) : (
                        formatValue(item.price)
                      )}
                    </td>
                    <td
                      className={cn(
                        "px-6 py-4 whitespace-nowrap text-sm",
                        item.call ? "text-green-600 font-bold" : "text-red-600",
                      )}
                    >
                      {formatValue(item.call)}
                    </td>
                    <td
                      className={cn(
                        "px-6 py-4 whitespace-nowrap text-sm",
                        item.put ? "text-green-600 font-bold" : "text-red-600",
                      )}
                    >
                      {formatValue(item.put)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <DropdownMenu.Root>
                        <DropdownMenu.Trigger asChild>
                          <button
                            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background hover:bg-accent hover:text-accent-foreground h-10 py-2 px-4"
                            disabled={isLoading}
                          >
                            <DotsVerticalIcon className="h-4 w-4" />
                          </button>
                        </DropdownMenu.Trigger>
                        <DropdownMenu.Portal>
                          <DropdownMenu.Content
                            className="min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-80"
                            sideOffset={5}
                            align="end"
                          >
                            <DropdownMenu.Item
                              className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                              onSelect={() => handleEditDp(index)}
                              disabled={editingRow !== null}
                            >
                              Edit
                            </DropdownMenu.Item>
                            <DropdownMenu.Item
                              className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-red-600"
                              onSelect={() => handleDeleteDp(item.name, item.price)}
                              disabled={isLoading}
                            >
                              Delete
                            </DropdownMenu.Item>
                          </DropdownMenu.Content>
                        </DropdownMenu.Portal>
                      </DropdownMenu.Root>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    {isLoading ? "Loading data..." : "No data available"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="name-input" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              type="text"
              id="name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="price-input" className="block text-sm font-medium text-gray-700">
              Price
            </label>
            <input
              type="text"
              id="price-input"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleUpdate}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? "Updating..." : "Update"}
            </button>
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchPriceData}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Refresh
            </button>
          </div>
        </div>
      </TileContent>
    </Tile>
  )
}
