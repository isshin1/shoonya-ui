"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { API_BASE_URL } from "@/utils/env"
import { ReloadIcon, TrashIcon, PlusIcon } from "@radix-ui/react-icons"
import { Tile, TileHeader, TileTitle, TileContent } from "@/components/ui/tile"
import { cn } from "@/lib/utils"
import { Target, Plus, Trash2, Edit3 } from 'lucide-react';

// Update the type to match the actual API response
type PriceData = {
  id?: string
  name: string
  price: string | number
  call: boolean | number | string
  put: boolean | number | string
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
      const response = await fetch(`${API_BASE_URL}/api/getDps`)
      if (!response.ok) {
        throw new Error(`Failed to fetch price data: ${response.status}`)
      }
      const text = await response.text()
      try {
        const data = JSON.parse(text)
        if (Array.isArray(data)) {
          setTableData(data)
        } else if (data && typeof data === "object") {
          if (Array.isArray(data.data)) {
            setTableData(data.data)
          } else {
            setTableData([data])
          }
        } else {
          setError("API returned unexpected data format")
          setTableData([])
        }
      } catch (parseError) {
        if (text.trim().startsWith("[") && text.trim().endsWith("]")) {
          setError(`Invalid JSON array: ${(parseError as Error).message}`)
        } else {
          setError(`API returned a string: ${text}`)
          if (text.includes("{") && text.includes("}")) {
            try {
              const extractedObjects = text.match(/\{[^{}]*\}/g)
              if (extractedObjects && extractedObjects.length > 0) {
                const parsedObjects = extractedObjects.map(obj => {
                  try {
                    return JSON.parse(obj)
                  } catch (e) {
                    return null
                  }
                }).filter(Boolean)
                if (parsedObjects.length > 0) {
                  setTableData(parsedObjects)
                }
              }
            } catch (e) {}
          }
        }
      }
    } catch (error: any) {
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
        headers: { "Content-Type": "application/json" },
      })
      if (!response.ok) throw new Error("Failed to update price")
      toast({ title: "Success", description: "Price updated successfully." })
      setName("")
      setPrice("")
      fetchPriceData()
    } catch (error) {
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
      if (!response.ok) throw new Error("Failed to delete price point")
      toast({ title: "Success", description: "Price point deleted successfully." })
      fetchPriceData()
    } catch (error) {
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
    setEditingRow({ index, newPrice: item.price.toString() })
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
      if (!response.ok) throw new Error("Failed to update price point")
      toast({ title: "Success", description: "Price point updated successfully." })
      setEditingRow(null)
      fetchPriceData()
    } catch (error) {
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
    if (!API_BASE_URL) {
      setError("API base URL is not configured properly")
      toast({
        title: "Configuration Error",
        description: "API base URL is not configured properly.",
        variant: "destructive",
      })
      return
    }
    fetchPriceData()
    const intervalId = setInterval(fetchPriceData, 60 * 1000)
    return () => clearInterval(intervalId)
  }, [])

  const formatValue = (value: any): string => {
    if (typeof value === "number") return value.toFixed(2)
    if (typeof value === "boolean") return value ? "Strong" : "Weak"
    if (value === "Strong" || value === "Weak" || value === "Neutral") return value
    if (value === null || value === undefined) return "Neutral"
    return String(value)
  }

  const getCallPutColor = (value: any): string => {
    const formatted = formatValue(value)
    if (formatted === "Strong") return "text-green-600 font-semibold"
    if (formatted === "Weak") return "text-red-600 font-semibold"
    return "text-gray-600"
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="font-semibold text-sm text-gray-900">Price Points</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{tableData.length} Points</span>
          <button
            onClick={fetchPriceData}
            disabled={isLoading}
            aria-label="Refresh"
            className="p-1 hover:bg-gray-100 rounded"
          >
            <ReloadIcon className={cn("h-4 w-4 text-gray-500", isLoading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-4 text-sm">
            <p className="font-medium">Error:</p>
            <p>{error}</p>
          </div>
        )}

        {/* Table Header */}
        <div className="border border-gray-200 px-3 rounded-lg">
          <div className="grid grid-cols-5 gap-4 py-3 text-sm font-medium text-gray-700 border-b border-gray-200">
            <div>Name</div>
            <div>Price</div>
            <div>Call</div>
            <div>Put</div>
            <div></div>
          </div>

          {/* Table Rows */}
          <div className="space-y-1">
            {tableData.length > 0 ? (
              tableData.map((item, index) => (
                <div key={item.id || index} className="grid grid-cols-5 gap-4 py-3 text-sm border-b border-gray-100 last:border-b-0">
                  <div className="font-medium text-gray-900">
                    {item.name || "N/A"}
                  </div>
                  <div className="text-gray-900">
                    {editingRow && editingRow.index === index ? (
                      <input
                        type="text"
                        value={editingRow.newPrice}
                        onChange={e => setEditingRow({ ...editingRow, newPrice: e.target.value })}
                        onKeyDown={e => {
                          if (e.key === "Enter") {
                            handleUpdateDp(item.name, item.price, editingRow.newPrice)
                          } else if (e.key === "Escape") {
                            setEditingRow(null)
                          }
                        }}
                        autoFocus
                        className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    ) : (
                      <span onClick={() => handleEditDp(index)} className="cursor-pointer hover:bg-gray-50 px-1 py-1 rounded">
                        ₹{typeof item.price === 'number' ? item.price.toLocaleString('en-IN') : item.price}
                      </span>
                    )}
                  </div>
                  <div className={getCallPutColor(item.call)}>
                    {formatValue(item.call)}
                  </div>
                  <div className={getCallPutColor(item.put)}>
                    {formatValue(item.put)}
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleDeleteDp(item.name, item.price)}
                      disabled={isLoading}
                      className="p-1 hover:bg-red-50 text-red-500 hover:text-red-700 rounded"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-2 text-center text-gray-500">
                {isLoading ? "Loading data..." : "No data available"}
              </div>
            )}
          </div>
        </div>
        {/* Input Section */}
        <div className="mt-2 pt-4  border-gray-200">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <input
              type="text"
              value={name}
              placeholder="Point Name"
              onChange={e => setName(e.target.value)}
              className="px-3 py-2 bg-gray-100 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="relative">
              <input
                type="text"
                value={price}
                placeholder="Price"
                onChange={e => setPrice(e.target.value)}
                className="w-full bg-gray-100 px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={fetchPriceData}
                disabled={isLoading}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
              >
                <ReloadIcon className={cn("h-3 w-3 text-gray-400", isLoading && "animate-spin")} />
              </button>
            </div>
          </div>
          
          <button
            onClick={handleUpdate}
            disabled={isLoading || !name.trim() || !price.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-1 text-sm font-medium text-black bg-gray-50 border border-gray-300 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PlusIcon className="h-4 w-4 text-black" />
            {isLoading ? "Adding..." : "Add Price Point"}
          </button>
        </div>
      </div>
    </div>
  )
}