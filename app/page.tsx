"use client"

import {} from "@stitches/react"
import axios from "axios"
import { useState, useEffect, useCallback } from "react"
import { useToast } from "@/components/ui/use-toast"
import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarTrigger,
  SidebarProvider,
  DialogOverlay as DefaultDialogOverlay,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"
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
import { fetchOptionSymbols, fetchOptionPrices, buyOption } from "./api/options"
import { Textarea } from "@/components/ui/textarea"
import { fetchQuote } from "./api/fetchQuote"
import { closeWebSocket, initializeWebSocket } from "./websocket/websocket"
import Link from "next/link"
import { RealTimeChart } from "../components/chart"
import { fetchOpenOrders, cancelOrder, fetchOpenOrdersCallback } from "./api/orders"
import { endSession, addMoney } from "./api/session"
import { Resizable } from "@/components/resizable"
import { PlanInputs } from "@/components/plan-inputs"
import { PositionsCard } from "@/components/positions"
import { updateData } from "./websocket/updateComponents"

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
  tsym: string
  prc: string
  qty: string
  currentTradingPrice: string
  prctyp: "LMT" | "SL-LMT"
  norenordno: string
}

type PlanInputs = {
  bias: string
  orderFlow: string
  criticalMass: string
  currentRange: string
  space: string
  tradeType: string
}

type OrderType = "MKT" | "LMT" | "SL-LMT"

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
  const [putPrice, setPutPrice] = useState("")
  const [currentTab, setCurrentTab] = useState<"call" | "put">("call")
  const [quote, setQuote] = useState("")
  const [isLoading, setIsLoading] = useState({
    options: false,
    openOrders: false,
    quote: false,
    buyOrder: false,
    modifyOrder: false,
  })
  const [orderType, setOrderType] = useState<OrderType>("MKT")
  const [planInputs, setPlanInputs] = useState<PlanInputs>({
    bias: "bearish",
    orderFlow: "",
    criticalMass: "",
    currentRange: "",
    space: "",
    tradeType: "",
  })
  const [plan, setPlan] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<OpenOrder | null>(null)
  const [newPrice, setNewPrice] = useState<string>("")
  const [isModifyOrderOpen, setIsModifyOrderOpen] = useState(false) // Added state for Modify Order dialog
  const [timerLeft, setTimerLeft] = useState<string | null>(null)

  const { toast } = useToast()

  const handlePlanInputChange = (key: keyof PlanInputs, value: string) => {
    setPlanInputs((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

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

  const modifyOrder = async () => {
    if (!selectedOrder) return

    setIsLoading((prev) => ({ ...prev, modifyOrder: true }))
    setIsModifyOrderOpen(false) // Close the dialog immediately

    try {
      const response = await axios.post(`http://localhost:8090/api/modifyOrder/${selectedOrder.norenordno}/${newPrice}`)
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
    const result = await buyOption(type, orderType, price, symbol, setIsLoading)
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <SidebarProvider defaultOpen={false}>
        <AppSidebar />
        <SidebarInset className="flex flex-col w-full">
          <header className="flex items-center h-10 border-b">
            <div className="flex-grow">
              <div className="text-left cursor-pointer pl-2" onClick={fetchQuoteCallback}>
                <p className="text-xs italic inline-block hover:bg-gray-100 rounded transition-colors px-1">
                  {isLoading.quote ? "Fetching quote..." : quote || "No quote available"}
                </p>
              </div>
            </div>
            <div className="flex-shrink-0 mx-4">
              {timerLeft && timerLeft !== "00:00" && (
                <div className="h-full flex items-center px-3 bg-yellow-100 text-yellow-800">
                  Next order in: {timerLeft}
                </div>
              )}
            </div>
            <div className="flex-shrink-0 flex space-x-2">
              <Dialog open={isAddMoneyOpen} onOpenChange={setIsAddMoneyOpen}>
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
              </Dialog>
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
          <div className="flex-1 overflow-hidden">
            <Resizable defaultSize={30} minSize={20} maxSize={80}>
              <div className="h-full overflow-y-auto pr-4">
                <Card className="mb-4 border-none">
                  <CardContent className="space-y-4">
                    <Card className="border-none">
                      <CardContent className="p-4 text-sm">
                        <Tabs
                          defaultValue="call"
                          className="h-full flex flex-col"
                          onValueChange={(value) => setCurrentTab(value as "call" | "put")}
                        >
                          <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="call">Call</TabsTrigger>
                            <TabsTrigger value="put">Put</TabsTrigger>
                          </TabsList>
                          <TabsContent value="call" className="flex-grow">
                            <div className="space-y-4">
                              <Tabs
                                defaultValue="MKT"
                                className="w-full"
                                onValueChange={(value) => setOrderType(value as OrderType)}
                              >
                                <TabsList className="grid w-full grid-cols-3 bg-transparent border-none">
                                  <TabsTrigger
                                    value="MKT"
                                    className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-purple-600 data-[state=active]:border-b-2 data-[state=active]:border-purple-600 rounded-none border-none"
                                  >
                                    Market
                                  </TabsTrigger>
                                  <TabsTrigger
                                    value="LMT"
                                    className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-purple-600 data-[state=active]:border-b-2 data-[state=active]:border-purple-600 rounded-none border-none"
                                  >
                                    Limit
                                  </TabsTrigger>
                                  <TabsTrigger
                                    value="SL-LMT"
                                    className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-purple-600 data-[state=active]:border-b-2 data-[state=active]:border-purple-600 rounded-none border-none"
                                  >
                                    Stop Limit
                                  </TabsTrigger>
                                </TabsList>
                                <TabsContent value="MKT" className="space-y-4 pt-4">
                                  <Button
                                    onClick={() => handleBuyOption("call", orderType, callPrice, atmCall.symbol)}
                                    className="w-full"
                                    disabled={isLoading.buyOrder}
                                  >
                                    {isLoading.buyOrder ? "Buying..." : "Buy Call"}
                                  </Button>
                                </TabsContent>
                                <TabsContent value="LMT" className="space-y-4 pt-4">
                                  <div>
                                    <label htmlFor="callPrice" className="block text-sm font-medium text-gray-700">
                                      Price
                                    </label>
                                    <Input
                                      id="callPrice"
                                      type="number"
                                      value={callPrice}
                                      onChange={(e) => setCallPrice(e.target.value ?? 0.0)}
                                      placeholder="Enter limit price"
                                    />
                                  </div>
                                  <Button
                                    onClick={() => handleBuyOption("call", orderType, callPrice, atmCall.symbol)}
                                    className="w-full"
                                    disabled={isLoading.buyOrder}
                                  >
                                    {isLoading.buyOrder ? "Buying..." : "Buy Call"}
                                  </Button>
                                </TabsContent>
                                <TabsContent value="SL-LMT" className="space-y-4 pt-4">
                                  <div>
                                    <label htmlFor="callStopPrice" className="block text-sm font-medium text-gray-700">
                                      Price
                                    </label>
                                    <Input
                                      id="callStopPrice"
                                      type="number"
                                      value={callPrice}
                                      onChange={(e) => setCallPrice(e.target.value ?? 0.0)}
                                      placeholder="Enter stop limit price"
                                    />
                                  </div>
                                  <Button
                                    onClick={() => handleBuyOption("call", orderType, callPrice, atmCall.symbol)}
                                    className="w-full"
                                    disabled={isLoading.buyOrder}
                                  >
                                    {isLoading.buyOrder ? "Buying..." : "Buy Call"}
                                  </Button>
                                </TabsContent>
                              </Tabs>
                              <div className="text-sm text-gray-500">Latest price: ₹{atmCall.price.toFixed(2)}</div>
                            </div>
                          </TabsContent>
                          <TabsContent value="put" className="flex-grow">
                            <div className="space-y-4">
                              <Tabs
                                defaultValue="MKT"
                                className="w-full"
                                onValueChange={(value) => setOrderType(value as OrderType)}
                              >
                                <TabsList className="grid w-full grid-cols-3 bg-transparent border-none">
                                  <TabsTrigger
                                    value="MKT"
                                    className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-purple-600 data-[state=active]:border-b-2 data-[state=active]:border-purple-600 rounded-none border-none"
                                  >
                                    Market
                                  </TabsTrigger>
                                  <TabsTrigger
                                    value="LMT"
                                    className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-purple-600 data-[state=active]:border-b-2 data-[state=active]:border-purple-600 rounded-none border-none"
                                  >
                                    Limit
                                  </TabsTrigger>
                                  <TabsTrigger
                                    value="SL-LMT"
                                    className="bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-purple-600 data-[state=active]:border-b-2 data-[state=active]:border-purple-600 rounded-none border-none"
                                  >
                                    Stop Limit
                                  </TabsTrigger>
                                </TabsList>
                                <TabsContent value="MKT" className="space-y-4 pt-4">
                                  <Button
                                    onClick={() => handleBuyOption("put", "MKT", putPrice, atmPut.symbol)}
                                    className="w-full"
                                    disabled={isLoading.buyOrder}
                                  >
                                    {isLoading.buyOrder ? "Buying..." : "Buy Put"}
                                  </Button>
                                </TabsContent>
                                <TabsContent value="LMT" className="space-y-4 pt-4">
                                  <div>
                                    <Input
                                      id="putPrice"
                                      type="number"
                                      value={putPrice}
                                      onChange={(e) => setPutPrice(e.target.value)}
                                      placeholder="Enter limit price"
                                    />
                                  </div>
                                  <Button
                                    onClick={() => handleBuyOption("put", "LMT", putPrice, atmPut.symbol)}
                                    className="w-full"
                                    disabled={isLoading.buyOrder}
                                  >
                                    {isLoading.buyOrder ? "Buying..." : "Buy Put"}
                                  </Button>
                                </TabsContent>
                                <TabsContent value="SL-LMT" className="space-y-4 pt-4">
                                  <div>
                                    <label htmlFor="putStopPrice" className="block text-sm font-medium text-gray-700">
                                      Price
                                    </label>
                                    <Input
                                      id="putStopPrice"
                                      type="number"
                                      value={putPrice}
                                      onChange={(e) => setPutPrice(e.target.value)}
                                      placeholder="Enter stop limit price"
                                    />
                                  </div>
                                  <Button
                                    onClick={() => handleBuyOption("put", "SL-LMT", putPrice, atmPut.symbol)}
                                    className="w-full"
                                    disabled={isLoading.buyOrder}
                                  >
                                    {isLoading.buyOrder ? "Buying..." : "Buy Put"}
                                  </Button>
                                </TabsContent>
                              </Tabs>
                              <div className="text-sm text-gray-500">Latest price: ₹{atmPut.price.toFixed(2)}</div>
                            </div>
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    </Card>
                    <PlanInputs
                      planInputs={planInputs}
                      handlePlanInputChange={handlePlanInputChange}
                      plan={plan}
                      setPlan={setPlan}
                    />
                    <Card className="border-none">
                      <CardHeader className="p-4">
                        <CardTitle>Open Orders</CardTitle>
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
                                  <TableCell className="font-medium">{order.tsym}</TableCell>
                                  <TableCell>₹{order.prc}</TableCell>
                                  <TableCell>{order.qty}</TableCell>
                                  <TableCell>{order.prctyp}</TableCell>
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
                                        <DropdownMenuItem onClick={() => handleCancelOrderWrapper(order.norenordno)}>
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
                  </CardContent>
                </Card>
              </div>
              <div className="h-full flex flex-col">
                <Card className="flex-grow overflow-y-auto mb-4 border-none">
                  <CardHeader className="p-2">
                    <CardTitle>
                      {currentTab === "call" ? convertString(atmCall.symbol) : convertString(atmPut.symbol)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-[calc(100%-3rem)] p-0">
                    <RealTimeChart
                      atmCallSymbol={atmCall.symbol}
                      atmPutSymbol={atmPut.symbol}
                      currentTab={currentTab}
                      atmCallPrice={atmCall.price}
                      atmPutPrice={atmPut.price}
                      atmCallTt={atmCall.tt}
                      atmPutTt={atmPut.tt}
                    />
                  </CardContent>
                </Card>
                <PositionsCard positions={positions} className="border-none" />
              </div>
            </Resizable>
          </div>
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
              <label htmlFor="newPrice" className="block text-sm font-medium text-gray-700 pb-2">
                New Price
              </label>
              <Input
                id="newPrice"
                type="number"
                placeholder="Enter new price"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
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

