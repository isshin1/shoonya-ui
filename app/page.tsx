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
import { TrendingUp, Settings, LogOut, Bell } from 'lucide-react';

import { updateData } from "./websocket/updateComponents"
import { useState } from "react"
import { updateTargets } from "./api/targets"
import { fetchMargin } from "./api/margin"
import "../styles/global.css"
import { PriceTable } from "@/components/price-table"
import { TradePlanPopup } from "@/components/trade-plan-popup"
import { EconomicCalendarPopup } from "@/components/economic-calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { UpdateTargets } from "@/components/UpdateTargets"
import { OpenOrdersTable } from "@/components/OpenOrdersTable"
 import { TradeModeSelector } from "@/components/TradeModeSelector"
 import OptionTradingPanel from "@/components/OptionTradingPanel"
import { RealTimeChart } from "@/components/chart"
const TradingViewWidget = dynamic(() => import("@/components/trading-view-widget"), { ssr: false })

import type { Position } from '@/types/types'

type OrderType = "SL" | "LIMIT" | "STOP_LOSS"

function convertString(inputString: string) {
  const regex = /(NIFTY)(\d{2}[A-Z]{3}\d{2})(C|P)(\d+)/
  const convertedString = inputString.replace(regex, (match, p1, p2, p3, p4) => {
    const ceOrPe = p3 === "C" ? "CE" : "PE"
    return `${p1} ${p2} ${p4} ${ceOrPe}`
  })
  return convertedString
}

type OpenOrder = {
  tradingSymbol: string
  price: string
  quantity: string
  currentTradingPrice: string
  orderType: "LIMIT" | "STOP_LOSS"
  orderId: string
  norenordno: string
  prc: string
  transactionType: "BUY" | "SELL"
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
  const [callPrice, setCallPrice] = useState(0.0)
  const [lastCallPrice, setLastCallPrice] = useState(0.0);
  const [putPrice, setPutPrice] = useState(0.0)
  const [lastPutPrice, setLastPutPrice] = useState(0.0);
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
  const [selectedOrder, setSelectedOrder] = useState<OpenOrder | null>(null)
  const [newPrice, setNewPrice] = useState<number>(0.0)
  const [isModifyOrderOpen, setIsModifyOrderOpen] = useState(false)
  const [timerLeft, setTimerLeft] = useState<string | null>(null)
  const [t1, setT1] = useState("20")
  const [t2, setT2] = useState("0")
  const [bofEnabled, setBofEnabled] = useState(false)
  const [callBofEnabled, setCallBofEnabled] = useState(false)
  const [putBofEnabled, setPutBofEnabled] = useState(false)
  const [tradeMode, setTradeMode] = useState<"no-trade" | "call" | "put">("no-trade")

  const [margin, setMargin] = useState<number | null>(null)

  const { toast } = useToast()

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

  const handleRefreshTrade = () => {
    setIsLoading((prev) => ({ ...prev, refreshTrade: true }))

    toast({
      title: "Success",
      description: "Trade refresh initiated",
      variant: "default",
    })

    refreshTrade().catch((error) => {
      console.error("Error in background refresh:", error)
    })

    setTimeout(() => {
      setIsLoading((prev) => ({ ...prev, refreshTrade: false }))
    }, 1000)
  }

  const modifyOrder = async () => {
    if (!selectedOrder) return

    setIsLoading((prev) => ({ ...prev, modifyOrder: true }))
    setIsModifyOrderOpen(false)

    try {
      const response = await axios.post(`${API_BASE_URL}/api/modifyOrder/${selectedOrder.orderId}/${newPrice}`)
      if (response.status === 200) {
        toast({
          title: "Order Modification Sent",
          description: `Modification request for order ${selectedOrder.orderId} has been sent.`,
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
      setNewPrice(0)
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
    if (isModifyOrderOpen) {
      const inputElement = document.getElementById("newPrice")
      if (inputElement) {
        inputElement.focus()
      }
    }
  }, [isModifyOrderOpen])

  const handleBuyOption = async (type: "call" | "put", orderType: OrderType, price: number, symbol: string) => {
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
    setCallPrice(Math.round(atmCall.price * 10) / 10);
  };

  const handleCallPriceBlur = () => {
    setTimeout(() => {
      setCallPrice(0.0);
    }, 500);
  };

  const handlePutPriceFocus = () => {
    setPutPrice(Math.round(atmPut.price * 10) / 10 );
  };

  const handlePutPriceBlur = () => {
    setTimeout(() => {
      setPutPrice(0.0);
    }, 500);
  };

return (
  <div className="flex h-screen w-screen overflow-hidden">
    <SidebarProvider defaultOpen={false}>
      <AppSidebar onCollapsedChange={() => {}} />
      <SidebarInset className="flex flex-col w-full">
        <header className="flex items-center h-20 border-b px-3">
          <div className="flex-grow flex items-center">
            <TradeModeSelector 
              tradeMode={tradeMode} 
              onTradeModeChange={setTradeMode} 
              setCurrentTab={setCurrentTab}
            />
          </div>
          <div className="flex-shrink-0 mx-4">
            {timerLeft && timerLeft !== "00:00" && (
              <div className="h-full flex items-center px-3 bg-yellow-100 text-yellow-800">
                <span className="font-mono ml-1">Next order in: {timerLeft}</span>
              </div>
            )}
          </div>
          <div className="flex-shrink-0 flex space-x-2">
            <div className="sm:block hidden">
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
            </div>
            <AlertDialog open={isEndSessionOpen} onOpenChange={setIsEndSessionOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                  <LogOut className="h-4 w-4 mr-1" />
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
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* LEFT COLUMN: Chart and Open Orders (Desktop) / Chart only (Mobile) */}
          <div className="flex-1 min-w-0 flex flex-col">
            {/* Chart Section */}
            <div className="h-[50vh] lg:h-[70%] w-full">
              <RealTimeChart
                atmCallSymbol={atmCall.symbol}
                atmPutSymbol={atmPut.symbol}
                currentTab={currentTab}
                atmCallPrice={atmCall.price}
                atmPutPrice={atmPut.price}
                atmCallTt={atmCall.tt}
                atmPutTt={atmPut.tt}
              />
            </div>
            
            {/* Open Orders - Desktop only */}
            <div className="hidden lg:block flex-1 p-4 overflow-auto">
              <OpenOrdersTable
                openOrders={openOrders}
                onCancelOrder={handleCancelOrderWrapper}
                onModifyOrder={(order) => {
                  setSelectedOrder(order)
                  setNewPrice(Number(order.prc))
                  setIsModifyOrderOpen(true)
                }}
              />
            </div>
          </div>

          {/* RIGHT COLUMN: Desktop sidebar content */}
          <div className="hidden lg:block w-[600px] border-l border-gray-200 overflow-auto p-4 space-y-4 bg-gray-50">
            <UpdateTargets />
            <PriceTable />
            <OptionTradingPanel
              atmCall={atmCall}
              atmPut={atmPut}
              currentTab={currentTab}
              setCurrentTab={setCurrentTab}
              convertString={convertString}
              callPrice={callPrice}
              setCallPrice={setCallPrice}
              putPrice={putPrice}
              setPutPrice={setPutPrice}
              isLoading={isLoading}
              tradeMode={tradeMode}
              orderType={orderType}
              setOrderType={setOrderType}
              callBofEnabled={callBofEnabled}
              setCallBofEnabled={setCallBofEnabled}
              putBofEnabled={putBofEnabled}
              setPutBofEnabled={setPutBofEnabled}
              handleBuyOption={handleBuyOption}
              handleCallPriceFocus={handleCallPriceFocus}
              handleCallPriceBlur={handleCallPriceBlur}
              handlePutPriceFocus={handlePutPriceFocus}
              handlePutPriceBlur={handlePutPriceBlur}
              openOrders={openOrders}
              handleCancelOrderWrapper={handleCancelOrderWrapper}
              setSelectedOrder={setSelectedOrder}
              setNewPrice={setNewPrice}
              setIsModifyOrderOpen={setIsModifyOrderOpen}
            />
          </div>
        </div>

        {/* Mobile-only horizontal scrolling cards */}
        <div className="lg:hidden h-[40vh] border-t border-gray-200 bg-gray-50">
          <div className="h-full overflow-x-auto overflow-y-hidden">
            <div className="flex h-full w-max">
              {/* Option Trading Panel Card */}
              <div className="w-[95vw] h-full flex-shrink-0 p-2">
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Trading Panel</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[calc(100%-4rem)] overflow-auto p-3">
                    <OptionTradingPanel
                      atmCall={atmCall}
                      atmPut={atmPut}
                      currentTab={currentTab}
                      setCurrentTab={setCurrentTab}
                      convertString={convertString}
                      callPrice={callPrice}
                      setCallPrice={setCallPrice}
                      putPrice={putPrice}
                      setPutPrice={setPutPrice}
                      isLoading={isLoading}
                      tradeMode={tradeMode}
                      orderType={orderType}
                      setOrderType={setOrderType}
                      callBofEnabled={callBofEnabled}
                      setCallBofEnabled={setCallBofEnabled}
                      putBofEnabled={putBofEnabled}
                      setPutBofEnabled={setPutBofEnabled}
                      handleBuyOption={handleBuyOption}
                      handleCallPriceFocus={handleCallPriceFocus}
                      handleCallPriceBlur={handleCallPriceBlur}
                      handlePutPriceFocus={handlePutPriceFocus}
                      handlePutPriceBlur={handlePutPriceBlur}
                      openOrders={openOrders}
                      handleCancelOrderWrapper={handleCancelOrderWrapper}
                      setSelectedOrder={setSelectedOrder}
                      setNewPrice={setNewPrice}
                      setIsModifyOrderOpen={setIsModifyOrderOpen}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Open Orders Card */}
              <div className="w-[95vw] h-full flex-shrink-0 p-2">
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Open Orders</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[calc(100%-4rem)] overflow-auto p-3">
                    <OpenOrdersTable
                      openOrders={openOrders}
                      onCancelOrder={handleCancelOrderWrapper}
                      onModifyOrder={(order) => {
                        setSelectedOrder(order)
                        setNewPrice(Number(order.prc))
                        setIsModifyOrderOpen(true)
                      }}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Update Targets Card */}
              <div className="w-[95vw] h-full flex-shrink-0 p-2">
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Update Targets</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[calc(100%-4rem)] overflow-auto p-3">
                    <UpdateTargets />
                  </CardContent>
                </Card>
              </div>

              {/* Price Table Card */}
              <div className="w-[95vw] h-full flex-shrink-0 p-2">
                <Card className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Price Table</CardTitle>
                  </CardHeader>
                  <CardContent className="h-[calc(100%-4rem)] overflow-auto p-3">
                    <PriceTable />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>

        {/* Swipe indicators for mobile */}
        <div className="lg:hidden flex justify-center space-x-2 py-2 bg-gray-50">
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <div className="w-2 h-2 rounded-full bg-gray-300"></div>
          <div className="w-2 h-2 rounded-full bg-gray-300"></div>
          <div className="w-2 h-2 rounded-full bg-gray-300"></div>
        </div>

        {/* Footer with margin info */}
        <footer className="bg-gray-100 p-4 border-t flex justify-between items-center">
          <h2 className="text-lg font-semibold">Trading Dashboard</h2>
          <div className="text-right">
            <span className="text-sm text-gray-600">Margin:</span>
            <span className="ml-2 text-lg font-semibold">
              {margin !== null ? `₹${margin.toFixed(2)}` : "Loading..."}
            </span>
          </div>
        </footer>
      </SidebarInset>
    </SidebarProvider>
    
    <Dialog
      open={isModifyOrderOpen}
      onOpenChange={(open) => {
        setIsModifyOrderOpen(open)
        if (!open) {
          setSelectedOrder(null)
          setNewPrice(0)
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
              onChange={(e) => setNewPrice(Number(e.target.value))}
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

    <style jsx global>{`
      /* Remove up and down arrows from number input */
      input[type="number"]::-webkit-inner-spin-button,
      input[type="number"]::-webkit-outer-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      input[type="number"] {
        -moz-appearance: textfield;
      }
      
      /* Ensure smooth horizontal scrolling on mobile */
      .overflow-x-auto {
        -webkit-overflow-scrolling: touch;
      }
    `}</style>
  </div>
)
}