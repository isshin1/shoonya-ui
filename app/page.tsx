"use client"
import { API_BASE_URL } from "@/utils/env"

import type React from "react"

import {} from "@stitches/react"
import axios from "axios"
import { useEffect, useCallback } from "react"
import { useToast } from "@/components/ui/use-toast"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import dynamic from "next/dynamic"
import { buyOption } from "./api/options"
import { fetchQuote } from "./api/fetchQuote"
import { closeWebSocket, initializeWebSocket } from "./websocket/websocket"
import { cancelOrder, fetchOpenOrdersCallback } from "./api/orders"
import { endSession, addMoney } from "./api/session"
import { refreshTrade } from "./api/refreshTrade"
import { RefreshCw } from "lucide-react"

import { updateData } from "./websocket/updateComponents"
import { useState } from "react"
import { updateTargets } from "./api/targets"
import { fetchMargin } from "./api/margin"
import "../styles/global.css"
import { PriceTable } from "@/components/price-table"
import { TradePlanPopup } from "@/components/trade-plan-popup"
import { EconomicCalendarPopup } from "@/components/economic-calendar"
import { Checkbox } from "@/components/ui/checkbox"

const TradingViewWidget = dynamic(() => import("@/components/trading-view-widget"), { ssr: false })

type Position = {
  id: string
  symbol: string
  type: "call" | "put"
  entryPrice: number
  exitPrice: number
  currentPrice: number
  quantity: number
  status: "active" | "closed"
}

type OpenOrder = {
  tradingSymbol: string
  price: string
  quantity: string
  currentTradingPrice: string
  orderType: "LIMIT" | "STOP_LOSS"
  orderId: string
  transactionType: "BUY" | "SELL" // Add this line
}

// type PlanInputs = {
//   bias: string
//   orderFlow: string
//   criticalMass: string
//   currentRange: string
//   space: string
//   tradeType: string
// }

type OrderType = "MARKET" | "LIMIT" | "STOP_LOSS"

function convertString(inputString: string) {
  const regex = /(NIFTY)(\d{2}[A-Z]{3}\d{2})(C|P)(\d+)/
  const convertedString = inputString.replace(regex, (match, p1, p2, p3, p4) => {
    const ceOrPe = p3 === "C" ? "CE" : "PE"
    return `${p1} ${p2} ${p4} ${ceOrPe}`
  })
  return convertedString
}

export default function Home() {
  const [positions, setPositions] = useState<Position[]>([])
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([])
  const [atmCall, setAtmCall] = useState<{ price: number; symbol: string; token: number; tt: number }>({
    price: 0,
    symbol: "",
    token: 0,
    tt: 0,
  })
  const [atmPut, setAtmPut] = useState<{ price: number; symbol: string; token: number; tt: number }>({
    price: 0,
    symbol: "",
    token: 0,
    tt: 0,
  })
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false)
  const [isEndSessionOpen, setIsEndSessionOpen] = useState(false)
  const [amount, setAmount] = useState("")
  const [callPrice, setCallPrice] = useState("")
  const [lastCallPrice, setLastCallPrice] = useState("");
  const [putPrice, setPutPrice] = useState("")
  const [lastPutPrice, setLastPutPrice] = useState("");
  const [currentTab, setCurrentTab] = useState<"call" | "put">("call")
  const [quote, setQuote] = useState("")
  const [isLoading, setIsLoading] = useState({
    options: false,
    openOrders: false,
    quote: false,
    buyOrder: false,
    modifyOrder: false,
    refreshTrade: false,
  })
  const [orderType, setOrderType] = useState<OrderType>("LIMIT")
  // const [planInputs, setPlanInputs] = useState<PlanInputs>({
  //   bias: "bearish",
  //   orderFlow: "",
  //   criticalMass: "",
  //   currentRange: "",
  //   space: "",
  //   tradeType: "",
  // })
  // const [plan, setPlan] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<OpenOrder | null>(null)
  const [newPrice, setNewPrice] = useState<string>("")
  const [isModifyOrderOpen, setIsModifyOrderOpen] = useState(false) // Added state for Modify Order dialog
  const [timerLeft, setTimerLeft] = useState<string | null>(null)
  const [t1, setT1] = useState("20")
  const [t2, setT2] = useState("0")
  // const [t3, setT3] = useState("20")
  const [bofEnabled, setBofEnabled] = useState(false)
  const [callBofEnabled, setCallBofEnabled] = useState(false)
  const [putBofEnabled, setPutBofEnabled] = useState(false)
  const [tradeMode, setTradeMode] = useState<"no-trade" | "call" | "put">("no-trade")

  const [margin, setMargin] = useState<number | null>(null)

  const { toast } = useToast()

  // const handlePlanInputChange = (key: keyof PlanInputs, value: string) => {
  //   setPlanInputs((prev) => ({
  //     ...prev,
  //     [key]: value,
  //   }))
  // }

  const handleEndSession = async () => {
    try {
      const result = await endSession()
      toast({
        title: "Session Ended",
        description: result.message,
      })
      setIsEndSessionOpen(false)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to end session. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleAddMoney = async () => {
    try {
      const result = await addMoney(amount)
      toast({
        title: "Request Sent",
        description: result.message,
      })
      setIsAddMoneyOpen(false)
      setAmount("")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send add fund request. Please try again.",
        variant: "destructive",
      })
    }
  }

  const fetchQuoteCallback = useCallback(() => {
    fetchQuote(setIsLoading, setQuote)
  }, [])

  const handleRefreshTrade = () => {
    setIsLoading((prev) => ({ ...prev, refreshTrade: true }))

    // Show success message immediately
    toast({
      title: "Success",
      description: "Trade refresh initiated",
      variant: "success",
    })

    // Make API call without awaiting the response
    refreshTrade().catch((error) => {
      console.error("Error in background refresh:", error)
      // We don't show errors to the user since we've already shown success
    })

    // Stop the spinner after 1 second for visual feedback
    setTimeout(() => {
      setIsLoading((prev) => ({ ...prev, refreshTrade: false }))
    }, 1000)
  }

  const modifyOrder = async () => {
    if (!selectedOrder) return

    setIsLoading((prev) => ({ ...prev, modifyOrder: true }))
    setIsModifyOrderOpen(false) // Close the dialog immediately

    try {
      const response = await axios.post(`${API_BASE_URL}/api/modifyOrder/${selectedOrder.orderId}/${newPrice}`)
      if (response.status === 200) {
        toast({
          title: "Order Modification Sent",
          description: `Modification request for order ${selectedOrder.norenordno} has been sent.`,
        })
        fetchOpenOrdersCallback(setOpenOrders, setIsLoading, toast)
      } else {
        throw new Error("Failed to send modify order request")
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to send modify order request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading((prev) => ({ ...prev, modifyOrder: false }))
      setSelectedOrder(null)
      setNewPrice("")
    }
  }

  const handleCancelOrderWrapper = useCallback(
    (norenordno: string) => {
      cancelOrder(norenordno, () => fetchOpenOrdersCallback(setOpenOrders, setIsLoading, toast), toast)
    },
    [toast],
  )

  useEffect(() => {
    const handleWebSocketMessage = (message: any) => {
      updateData(message, { setAtmCall, setAtmPut, setOpenOrders, setPositions, setTimerLeft })
    }

    const socket = initializeWebSocket(handleWebSocketMessage)

    return () => {
      closeWebSocket()
    }
  }, [])

  useEffect(() => {
    fetchQuoteCallback()
    const intervalId = window.setInterval(
      () => {
        fetchQuoteCallback()
      },
      5 * 60 * 1000,
    )
    return () => {
      window.clearInterval(intervalId)
    }
  }, [fetchQuoteCallback])

  useEffect(() => {
    if (isModifyOrderOpen) {
      const inputElement = document.getElementById("newPrice")
      if (inputElement) {
        inputElement.focus()
      }
    }
  }, [isModifyOrderOpen])

  const handleBuyOption = async (type: "call" | "put", orderType: OrderType, price: string, symbol: string) => {
    const token = type === "call" ? atmCall.token.toString() : atmPut.token.toString()
    const bofEnabled = type === "call" ? callBofEnabled : putBofEnabled
    const result = await buyOption(type, orderType, price, token, bofEnabled, setIsLoading)
  }

  useEffect(() => {
    const fetchMarginData = async () => {
      try {
        const marginValue = await fetchMargin()
        setMargin(marginValue)
      } catch (error) {
        console.error("Error fetching margin:", error)
        toast({
          title: "Error",
          description: "Failed to fetch margin data. Please try again.",
          variant: "destructive",
        })
      }
    }

    fetchMarginData()
    // Fetch margin data every 5 minutes
    const intervalId = setInterval(fetchMarginData, 60 * 1000)

    return () => clearInterval(intervalId)
  }, [toast])

  const handleTargetChange = (setter: React.Dispatch<React.SetStateAction<string>>, value: string) => {
    const numValue = Number.parseInt(value)
    if (!isNaN(numValue) && numValue >= 0) {
      setter(numValue.toString())
    }
  }

  const incrementTarget = (setter: React.Dispatch<React.SetStateAction<string>>) => {
    setter((prev) => (Number.parseInt(prev) + 10).toString())
  }

  const decrementTarget = (setter: React.Dispatch<React.SetStateAction<string>>) => {
    setter((prev) => Math.max(0, Number.parseInt(prev) - 10).toString())
  }


  const handleCallPriceFocus = () => {
    setCallPrice(atmCall.price.toFixed(1));
  };

  const handleCallPriceBlur = () => {
    setTimeout(() => {
      setCallPrice("");
    }, 500); // 1000 milliseconds = 1 second

  };

  const handlePutPriceFocus = () => {
    setPutPrice(atmPut.price.toFixed(1));
  };

  const handlePutPriceBlur = () => {
    setTimeout(() => {
      setPutPrice("");
    }, 500); // 1000 milliseconds = 1 second
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <SidebarProvider defaultOpen={false}>
        <AppSidebar />
        <SidebarInset className="flex flex-col w-full">
          <header className="flex items-center h-10 border-b">
            <div className="flex-grow flex items-center">
              <div className="text-left cursor-pointer pl-2" onClick={fetchQuoteCallback}>
                <p className="text-xs italic inline-block hover:bg-gray-100 rounded transition-colors px-1">
                  {isLoading.quote ? "Fetching quote..." : quote || "No quote available"}
                </p>
              </div>
              <div className="ml-4">
                <div className="bg-gray-100 p-0.5 rounded-md flex h-8">
                  <button
                    className={`px-3 rounded-md text-xs font-medium transition-colors ${
                      tradeMode === "no-trade"
                        ? "bg-gray-900 text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                    onClick={() => setTradeMode("no-trade")}
                  >
                    No Trade
                  </button>
                  <button
                    className={`px-3 rounded-md text-xs font-medium transition-colors ${
                      tradeMode === "call" ? "bg-green-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
                    }`}
                    onClick={() => setTradeMode("call")}
                  >
                    Call
                  </button>
                  <button
                    className={`px-3 rounded-md text-xs font-medium transition-colors ${
                      tradeMode === "put" ? "bg-red-600 text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
                    }`}
                    onClick={() => setTradeMode("put")}
                  >
                    Put
                  </button>
                </div>
              </div>
            </div>
            <div className="flex-shrink-0 mx-4">
              {timerLeft && timerLeft !== "00:00" && (
                <div className="h-full flex items-center px-3 bg-yellow-100 text-yellow-800">
                  <span className="font-mono ml-1">Next order in: {timerLeft}</span>
                </div>
              )}
            </div>
            <div className="flex-shrink-0 flex space-x-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleRefreshTrade}
                disabled={isLoading.refreshTrade}
              >
                <RefreshCw className={`h-4 w-4 ${isLoading.refreshTrade ? "animate-spin" : ""}`} />
                <span className="sr-only">Refresh Trade</span>
              </Button>
              <EconomicCalendarPopup />
              <TradePlanPopup />
              {/* <Dialog open={isAddMoneyOpen} onOpenChange={setIsAddMoneyOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" className="h-full px-3">
                    Add Money
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Money</DialogTitle>
                  </DialogHeader>
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                  <Button onClick={handleAddMoney}>Confirm</Button>
                </DialogContent>
              </Dialog> */}
              <AlertDialog open={isEndSessionOpen} onOpenChange={setIsEndSessionOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" className="h-full px-3 text-red-500 hover:text-red-700">
                    End Session
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>This action will end your current trading session.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleEndSession}>End Session</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </header>
          <div className="flex-1 overflow-hidden border-0">
            <div className="h-full overflow-y-auto border-0">
              <Card className="h-full w-[700px] max-w-full mx-auto p-0 border-0">
                <CardContent className="space-y-4 h-full p-0 border-0">
                  <Card>
                    <CardContent className="p-4 text-sm">
                      <Tabs
                        defaultValue="call"
                        className="h-full flex flex-col"
                        onValueChange={(value) => setCurrentTab(value as "call" | "put")}
                      >
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="call">
                            {currentTab === "call" ? convertString(atmCall.symbol) : convertString(atmCall.symbol)}
                          </TabsTrigger>
                          <TabsTrigger value="put">
                            {currentTab === "put" ? convertString(atmPut.symbol) : convertString(atmPut.symbol)}
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent value="call" className="flex-grow">
                          <div className="space-y-4">
                            <Tabs
                              defaultValue="LIMIT"
                              className="w-full"
                              onValueChange={(value) => setOrderType(value as OrderType)}
                            >
                              <div className="text-sm text-gray-500 mb-2">
                                Latest price: ₹{atmCall.price.toFixed(2)}
                              </div>

                              <TabsContent value="LIMIT" className="space-y-4">
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <Input
                                      id="callPrice"
                                      type="number"
                                      value={callPrice}
                                      onChange={(e) => setCallPrice(e.target.value ?? 0.0)}
                                      // onChange={handleCallPriceChange}
                                      placeholder="Enter limit price"
                                      className="w-50"
                                      onFocus={handleCallPriceFocus}
                                      onBlur={handleCallPriceBlur}
                                    />
                                    <div className="flex items-center space-x-2">
 
                                      <Button
                                        onClick={() => handleBuyOption("call", orderType, callPrice, atmCall.symbol)}
                                        className="w-30"
                                        disabled={isLoading.buyOrder || tradeMode === "no-trade" || tradeMode === "put"}
                                      >
                                        {isLoading.buyOrder ? "Buying..." : "Buy Call"}
                                      </Button>
                                     <Checkbox
                                        id="callBof"
                                        checked={callBofEnabled}
                                        onCheckedChange={setCallBofEnabled}
                                      />
                                      <label
                                        htmlFor="callBof"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                      >
                                        BOF
                                      </label>
                                    </div>
                                  </div>
                                </div>

                              </TabsContent>

                              <TabsContent value="STOP_LOSS" className="space-y-4">
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <Input
                                      id="callStopPrice"
                                      type="number"
                                      value={callPrice}
                                      onChange={(e) => setCallPrice(e.target.value ?? 0.0)}
                                      placeholder="Enter stop limit price"
                                      className="w-50"
                                      onFocus={handleCallPriceFocus}
                                      onBlur={handleCallPriceBlur}
                                    />
                                    <Button
                                      onClick={() => handleBuyOption("call", orderType, callPrice, atmCall.symbol)}
                                      className="w-30"
                                      disabled={isLoading.buyOrder || tradeMode === "no-trade" || tradeMode === "put"}
                                    >
                                      {isLoading.buyOrder ? "Buying..." : "Buy Call"}
                                    </Button>
                                    <div className="flex items-center space-x-2">
                                      <Checkbox
                                        id="callStopBof"
                                        checked={callBofEnabled}
                                        onCheckedChange={setCallBofEnabled}
                                      />
                                      <label
                                        htmlFor="callStopBof"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                      >
                                        BOF
                                      </label>
                                    </div>
                                  </div>
                                </div>
                              </TabsContent>

                              <TabsContent value="SL" className="space-y-4">
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <Input
                                      id="callMarketPrice"
                                      type="number"
                                      value={callPrice}
                                      onChange={(e) => setCallPrice(e.target.value ?? 0.0)}
                                      placeholder="Enter SL price"
                                      className="w-50"
                                      onFocus={handleCallPriceFocus}
                                      onBlur={handleCallPriceBlur}
                                    />
                                    <Button
                                      onClick={() => handleBuyOption("call", orderType, callPrice, atmCall.symbol)}
                                      className="w-30"
                                      disabled={isLoading.buyOrder || tradeMode === "no-trade" || tradeMode === "put"}
                                    >
                                      {isLoading.buyOrder ? "Buying..." : "Buy Call"}
                                    </Button>
                                    <div className="flex items-center space-x-2">
                                      <Checkbox
                                        id="callSlBof"
                                        checked={callBofEnabled}
                                        onCheckedChange={setCallBofEnabled}
                                      />
                                      <label
                                        htmlFor="callSlBof"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                      >
                                        BOF
                                      </label>
                                    </div>
                                  </div>
                                </div>
 
                              </TabsContent>

                              <TabsList className="grid w-full grid-cols-3 mt-4">
                                <TabsTrigger
                                  value="SL"
                                  className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700 data-[state=active]:font-medium"
                                >
                                  SL
                                </TabsTrigger>
                                <TabsTrigger
                                  value="LIMIT"
                                  className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700 data-[state=active]:font-medium"
                                >
                                  Limit
                                </TabsTrigger>
                                <TabsTrigger
                                  value="STOP_LOSS"
                                  className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700 data-[state=active]:font-medium"
                                >
                                  Stop Limit
                                </TabsTrigger>
                              </TabsList>
                            </Tabs>
                          </div>
                        </TabsContent>
                        <TabsContent value="put" className="flex-grow">
                          <div className="space-y-4">
                            <Tabs
                              defaultValue="LIMIT"
                              className="w-full"
                              onValueChange={(value) => setOrderType(value as OrderType)}
                            >
                              <div className="text-sm text-gray-500 mb-2">Latest price: ₹{atmPut.price.toFixed(2)}</div>

                              <TabsContent value="LIMIT" className="space-y-4">
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <Input
                                      id="putPrice"
                                      type="number"
                                      value={putPrice}
                                      onChange={(e) => setPutPrice(e.target.value)}
                                      placeholder="Enter limit price"
                                      className="w-50"
                                      onFocus={handlePutPriceFocus}
                                      onBlur={handlePutPriceBlur}
                                    />
                                    <Button
                                      onClick={() => handleBuyOption("put", "LIMIT", putPrice, atmPut.symbol)}
                                      className="w-30"
                                      disabled={isLoading.buyOrder || tradeMode === "no-trade" || tradeMode === "call"}
                                    >
                                      {isLoading.buyOrder ? "Buying..." : "Buy Put"}
                                    </Button>
                                    <div className="flex items-center space-x-2">
                                      <Checkbox
                                        id="putBof"
                                        checked={putBofEnabled}
                                        onCheckedChange={setPutBofEnabled}
                                      />
                                      <label
                                        htmlFor="putBof"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                      >
                                        BOF
                                      </label>
                                    </div>
                                  </div>
                                </div>
                              </TabsContent>

                              <TabsContent value="STOP_LOSS" className="space-y-4">
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <Input
                                      id="putStopPrice"
                                      type="number"
                                      value={putPrice}
                                      onChange={(e) => setPutPrice(e.target.value)}
                                      placeholder="Enter stop limit price"
                                      className="w-50"
                                      onFocus={handlePutPriceFocus}
                                      onBlur={handlePutPriceBlur}
                                    />
                                    <Button
                                      onClick={() => handleBuyOption("put", "STOP_LOSS", putPrice, atmPut.symbol)}
                                      className="w-30"
                                      disabled={isLoading.buyOrder || tradeMode === "no-trade" || tradeMode === "call"}
                                    >
                                      {isLoading.buyOrder ? "Buying..." : "Buy Put"}
                                    </Button>
                                    <div className="flex items-center space-x-2">
                                      <Checkbox
                                        id="putStopBof"
                                        checked={putBofEnabled}
                                        onCheckedChange={setPutBofEnabled}
                                      />
                                      <label
                                        htmlFor="putStopBof"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                      >
                                        BOF
                                      </label>
                                    </div>
                                  </div>
                                </div>
                              </TabsContent>

                              <TabsContent value="SL" className="space-y-4">
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <Input
                                      id="putMarketPrice"
                                      type="number"
                                      value={putPrice}
                                      onChange={(e) => setPutPrice(e.target.value)}
                                      placeholder="Enter SL price"
                                      className="w-50"
                                      onFocus={handlePutPriceFocus}
                                      onBlur={handlePutPriceBlur}
                                    />
                                    <Button
                                      onClick={() => handleBuyOption("put", "SL", putPrice, atmPut.symbol)}
                                      className="w-30"
                                      disabled={isLoading.buyOrder || tradeMode === "no-trade" || tradeMode === "call"}
                                    >
                                      {isLoading.buyOrder ? "Buying..." : "Buy Put"}
                                    </Button>
                                    <div className="flex items-center space-x-2">
                                      <Checkbox
                                        id="putSlBof"
                                        checked={putBofEnabled}
                                        onCheckedChange={setPutBofEnabled}
                                      />
                                      <label
                                        htmlFor="putSlBof"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                      >
                                        BOF
                                      </label>
                                    </div>
                                  </div>
                                </div>

                              </TabsContent>

                              <TabsList className="grid w-full grid-cols-3 mt-4">
                                <TabsTrigger
                                  value="SL"
                                  className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700 data-[state=active]:font-medium"
                                >
                                  SL
                                </TabsTrigger>
                                <TabsTrigger
                                  value="LIMIT"
                                  className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700 data-[state=active]:font-medium"
                                >
                                  Limit
                                </TabsTrigger>
                                <TabsTrigger
                                  value="STOP_LOSS"
                                  className="data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700 data-[state=active]:font-medium"
                                >
                                  Stop Limit
                                </TabsTrigger>
                              </TabsList>
                            </Tabs>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                  {/* <PlanInputs
                      planInputs={planInputs}
                      handlePlanInputChange={handlePlanInputChange}
                      plan={plan}
                      setPlan={setPlan}
                    /> */}
                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm">Open Orders</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 text-sm">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[100px]">Symbol</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {openOrders.length > 0 ? (
                            openOrders.map((order) => (
                              <TableRow key={order.norenordno}>
                                <TableCell
                                  className={`font-medium ${
                                    order.transactionType === "BUY" ? "text-green-600" : "text-red-600"
                                  }`}
                                >
                                  {order.tradingSymbol}
                                </TableCell>
                                <TableCell>₹{order.price}</TableCell>
                                <TableCell>{order.quantity}</TableCell>
                                <TableCell>{order.orderType}</TableCell>
                                <TableCell>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">Open menu</span>
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          width="24"
                                          height="24"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          stroke="currentColor"
                                          strokeWidth="2"
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          className="h-4 w-4"
                                        >
                                          <circle cx="12" cy="12" r="1" />
                                          <circle cx="12" cy="5" r="1" />
                                          <circle cx="12" cy="19" r="1" />
                                        </svg>
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem onClick={() => handleCancelOrderWrapper(order.orderId)}>
                                        Cancel Order
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setSelectedOrder(order)
                                          setNewPrice(order.prc)
                                          setIsModifyOrderOpen(true) // Open the Modify Order dialog
                                        }}
                                      >
                                        Modify Order
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center">
                                No active orders
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                  <Card className="border-2 border-red-500">
                    <CardHeader className="p-4 bg-red-500 rounded-t-lg  ">
                      <CardTitle className="text-sm" >Update Targets</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 text-sm ">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-4">
                            {[
                            { label: "T1", value: t1, setter: setT1 },
                            { label: "T2", value: t2, setter: setT2 },
                            // { label: "T3", value: t3, setter: setT3 },
                          ].map(({ label, value, setter }) => (
                            <div key={label} className="flex items-center space-x-2">
                              {/* <Button
                                variant="outline"
                                className="px-4 py-1 bg-red-100 hover:bg-red-200 text-red-600 border-red-200"
                                onClick={() => decrementTarget(setter)}
                              >
                                -
                              </Button> */}
                             <div className="flex-grow relative">
                                <Input
                                  type="number"
                                  value={value}
                                  onChange={(e) => handleTargetChange(setter, e.target.value)}
                                  className="text-center pr-8 appearance-none no-spinner"
                                  min="0"
                                  step="10"
                                  placeholder={label}
                                /> 
                                <span className="absolute inset-y-0 left-0 bg-red-100 px-3 flex items-center text-sm text-gray-500">
                                  {label}
                                </span>
                              </div>
                              {/* <Button
                                variant="outline"
                                className="px-4 py-1 bg-green-100 hover:bg-green-200 text-green-600 border-green-200"
                                onClick={() => incrementTarget(setter)}
                              >
                                +
                              </Button> */}
                            </div>
                          ))}
                        </div>
                        <Button
                          className="px-4 py-1 w-60"
                          onClick={async () => {
                            const result = await updateTargets(t1, t2)
                            toast({
                              title: "Targets Updated",
                            })
                          }}
                        >
                          Update Targets
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <PriceTable />
                  </Card>
                </CardContent>
              </Card>
            </div>
          </div>
          <header className="bg-gray-100 p-4 border-t flex justify-between items-center">
            <h2 className="text-lg font-semibold">Trading Dashboard</h2>
            <div className="text-right">
              <span className="text-sm text-gray-600">Margin:</span>
              <span className="ml-2 text-lg font-semibold">
                {margin !== null ? `₹${margin.toFixed(2)}` : "Loading..."}
              </span>
            </div>
          </header>
        </SidebarInset>
      </SidebarProvider>
      <Dialog
        open={isModifyOrderOpen}
        onOpenChange={(open) => {
          setIsModifyOrderOpen(open)
          if (!open) {
            setSelectedOrder(null)
            setNewPrice("")
          }
        }}
        modal={false}
      >
        <DialogContent
          className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background rounded-lg shadow-lg p-6 w-full max-w-md mx-auto"
          forceMount
          onInteractOutside={(e) => {
            e.preventDefault()
          }}
        >
          <DialogHeader>
            <DialogTitle>Modify Order</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="newPrice" className="block text-sm font-medium text-gray-700 pb-2"></label>
              <Input
                id="newPrice"
                type="number"
                placeholder="Enter new price"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    modifyOrder()
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={modifyOrder} disabled={isLoading.modifyOrder}>
              {isLoading.modifyOrder ? "Sending..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
;<style jsx global>{`
  /* Remove up and down arrows from number input */
  input[type="number"]::-webkit-inner-spin-button,
  input[type="number"]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
  input[type="number"] {
    -moz-appearance: textfield;
  }
`}</style>
