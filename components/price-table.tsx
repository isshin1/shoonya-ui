"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { API_BASE_URL } from "@/utils/env"

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

  // Add this function after handleUpdate
  const loadTestData = () => {
    const testData = [
      {
        name: "22000",
        price: "pdc",
        call: false,
        put: false,
      },
      {
        name: "10000",
        price: "pdc",
        call: false,
        put: false,
      },
      {
        name: "23331",
        price: "pdc",
        call: false,
        put: false,
      },
    ]

    setTableData(testData)
    setError(null)
    toast({
      title: "Test Data Loaded",
      description: "Loaded sample data for testing",
    })
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
    <Card>
      <CardHeader className="p-1">

      </CardHeader>
      <CardContent className="p-1">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600">
            <p className="font-medium">Error:</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="mb-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Call</TableHead>
                <TableHead>Put</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.length > 0 ? (
                tableData.map((item, index) => (
                  <TableRow key={item.id || index}>
                    <TableCell className="font-medium">{item.name || "N/A"}</TableCell>
                    <TableCell>{formatValue(item.price)}</TableCell>
                    <TableCell className={item.call ? "text-green-600 font-medium" : "text-red-600"}>
                      {formatValue(item.call)}
                    </TableCell>
                    <TableCell className={item.put ? "text-green-600 font-medium" : "text-red-600"}>
                      {formatValue(item.put)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4">
                    {isLoading ? "Loading data..." : "No data available"}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-2">
          <div className="flex space-x-2 flex-grow">
          <Input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="flex-1" />
            <Input
              type="text"
              placeholder="Price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleUpdate} disabled={isLoading}>
              {isLoading ? "Updating..." : "Update"}
            </Button>
          </div>
          <div className="flex space-x-2">

            <Button variant="outline" onClick={fetchPriceData} disabled={isLoading}>
              Refresh
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

