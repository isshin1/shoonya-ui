"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/components/ui/use-toast"
import { API_BASE_URL } from "@/utils/env"
import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { DotsVerticalIcon, ReloadIcon } from "@radix-ui/react-icons"
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
    if (typeof value === "boolean") return value ? "Yes" : "No"
    if (value === null || value === undefined) return "N/A"
    return String(value)
  }

  return (
    <Tile className="border-2 border-indigo-400 rounded-lg ">
      <div className="bg-[#2E2867]  py-0 rounded-t-lg -m-[2px]">
        <TileHeader className="flex items-center justify-between py-2">
          <TileTitle className="text-white text-sm ">Price Points</TileTitle>
          <button
            onClick={fetchPriceData}
            disabled={isLoading}
            aria-label="Refresh"
            className="ml-auto inline-flex items-center px-2 py-2 border border-gray-300 text-sm font-medium rounded-full shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            <ReloadIcon className={isLoading ? "animate-spin h-5 w-5" : "h-5 w-5"} />
          </button>
        </TileHeader>
      </div>
      <TileContent >
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
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Price
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Call
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Put
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tableData.length > 0 ? (
                tableData.map((item, index) => (
                  <tr key={item.id || index}>
                    <td className="px-6 py-1 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.name || "N/A"}
                    </td>
                    <td className="px-6 py-1 whitespace-nowrap text-sm text-gray-500">
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
                          className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md  px-4 py-2 h-10"
                        />
                      ) : (
                        formatValue(item.price)
                      )}
                    </td>
                    <td className={cn(
                      "px-6 py-1 whitespace-nowrap text-sm",
                      item.call ? "text-green-600 font-bold" : "text-red-600"
                    )}>
                      {formatValue(item.call)}
                    </td>
                    <td className={cn(
                      "px-6 py-1 whitespace-nowrap text-sm",
                      item.put ? "text-green-600 font-bold" : "text-red-600"
                    )}>
                      {formatValue(item.put)}
                    </td>
                    <td className="px-6 py-1 whitespace-nowrap text-sm text-gray-500">
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

        {/* Inputs grid, no refresh button here */}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-3">
          <div>
            {/* <label htmlFor="name-input" className="block text-sm font-medium text-gray-700">
              Name
            </label> */}
            <input
              type="text"
              id="name-input"
              value={name}
              placeholder="Enter Name"
              onChange={e => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-black-100 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-2 h-10"
            />
          </div>
          <div>
            {/* <label htmlFor="price-input" className="block text-sm font-medium text-gray-700">
              Price
            </label> */}
            <input
              type="text"
              id="price-input"
              value={price}
              placeholder="Enter Price"
              onChange={e => setPrice(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-4 py-2 h-10"
            />
          </div>
          <div>
            <button
              onClick={handleUpdate}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isLoading ? "Updating..." : "Add DP"}
            </button>
          </div>
        </div>
      </TileContent>
    </Tile>
  )
}
