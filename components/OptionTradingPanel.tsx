// components/OptionTradingPanel.tsx
import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {OpenOrdersTable} from "@/components/OpenOrdersTable"
import {UpdateTargets} from "@/components/UpdateTargets"
import { PriceTable } from "@/components/price-table"
import { Checkbox } from "@/components/ui/checkbox"

type OrderType = "SL" | "LIMIT" | "STOP_LOSS"

interface OptionTradingPanelProps {
  atmCall: { symbol: string; price: number }
  atmPut: { symbol: string; price: number }
  currentTab: "call" | "put"
  setCurrentTab: (tab: "call" | "put") => void
  convertString: (s: string) => string
  callPrice: number
  putPrice: number
  setCallPrice: (p: number) => void
  setPutPrice: (p: number) => void
  isLoading: { buyOrder: boolean }
  tradeMode: "call" | "put" | "no-trade"
  orderType: "LIMIT" | "STOP_LOSS" | "SL"
  setOrderType: (type: "LIMIT" | "STOP_LOSS" | "SL") => void
  callBofEnabled: boolean
  setCallBofEnabled: (checked: boolean) => void
  putBofEnabled: boolean
  setPutBofEnabled: (checked: boolean) => void
  handleBuyOption: (
    side: "call" | "put",
    orderType: OrderType,
    price: number ,
    symbol: string
  ) => void
  handleCallPriceFocus: () => void
  handleCallPriceBlur: () => void
  handlePutPriceFocus: () => void
  handlePutPriceBlur: () => void
  openOrders: any[]
  handleCancelOrderWrapper: (id: string) => void
  setSelectedOrder: (order: any) => void
  setNewPrice: (p: number) => void
  setIsModifyOrderOpen: (open: boolean) => void
}

const OptionTradingPanel: React.FC<OptionTradingPanelProps> = ({
  atmCall,
  atmPut,
  currentTab,
  setCurrentTab,
  convertString,
  callPrice,
  setCallPrice,
  putPrice,
  setPutPrice,
  isLoading,
  tradeMode,
  orderType,
  setOrderType,
  callBofEnabled,
  setCallBofEnabled,
  putBofEnabled,
  setPutBofEnabled,
  handleBuyOption,
  handleCallPriceFocus,
  handleCallPriceBlur,
  handlePutPriceFocus,
  handlePutPriceBlur,
  openOrders,
  handleCancelOrderWrapper,
  setSelectedOrder,
  setNewPrice,
  setIsModifyOrderOpen
}) => {
  return (
    // <Card className="h-full w-[700px] max-w-full mx-auto p-0 border-0">
    //   <CardContent className="space-y-4 h-full p-0 border-0">
        <Card>
        <CardHeader className="pb-3 ">
          <CardTitle className="font-semibold text-sm">Option Trading</CardTitle>
        </CardHeader>
          <CardContent className="p-4 text-sm">
            {/* Main Call/Put Tabs */}
            <Tabs
              value={currentTab}
              className="h-full flex flex-col"
              onValueChange={(value) => setCurrentTab(value as "call" | "put")}
            >

              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="call">
                  {convertString(atmCall.symbol)}
                </TabsTrigger>
                <TabsTrigger value="put">
                  {convertString(atmPut.symbol)}
                </TabsTrigger>
              </TabsList>

              {/* -------- CALL Section -------- */}
              <TabsContent value="call" className="flex-grow">
                <div className="space-y-4">
                  <Tabs
                    defaultValue="LIMIT"
                    className="w-full"
                    onValueChange={(value) => setOrderType(value as any)}
                  >
                    <div className="text-sm text-gray-500 mb-2">
                      Latest price: ₹{atmCall.price.toFixed(2)}
                    </div>

                    {/* CALL Limit */}
                    <TabsContent value="LIMIT" className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Input
                          id="callPrice"
                          type="number"
                          value={callPrice}
                          onChange={(e) => setCallPrice(Number(e.target.value))}
                          placeholder="Enter limit price"
                          className="w-50"
                          onFocus={handleCallPriceFocus}
                          onBlur={handleCallPriceBlur}
                        />
                        <Button
                          onClick={() =>
                            handleBuyOption("call", orderType, callPrice, atmCall.symbol)
                          }
                          className="w-30"
                          disabled={
                            isLoading.buyOrder || tradeMode === "no-trade" || tradeMode === "put"
                          }
                        >
                          {isLoading.buyOrder ? "Buying..." : "Buy Call"}
                        </Button>
                        <Checkbox
                          id="callBof"
                          checked={callBofEnabled}
                          onCheckedChange={setCallBofEnabled}
                        />
                        <label htmlFor="callBof" className="text-sm font-medium leading-none">
                          BOF
                        </label>
                      </div>
                    </TabsContent>
                    {/* Repeat the STOP_LOSS and SL blocks as in your original code... */}

                    {/* CALL Tabs Switcher */}
                    <TabsList className="grid w-full grid-cols-3 mt-4">
                      <TabsTrigger value="SL">SL</TabsTrigger>
                      <TabsTrigger value="LIMIT">Limit</TabsTrigger>
                      <TabsTrigger value="STOP_LOSS">Stop Limit</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </TabsContent>

              {/* -------- PUT Section -------- */}
              <TabsContent value="put" className="flex-grow">
                <div className="space-y-4">
                  <Tabs
                    defaultValue="LIMIT"
                    className="w-full"
                    onValueChange={(value) => setOrderType(value as any)}
                  >
                    <div className="text-sm text-gray-500 mb-2">
                      Latest price: ₹{atmPut.price.toFixed(2)}
                    </div>

                    {/* PUT Limit */}
                    <TabsContent value="LIMIT" className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Input
                          id="putPrice"
                          type="number"
                          value={putPrice}
                          onChange={(e) => setPutPrice(Number(e.target.value))}
                          placeholder="Enter limit price"
                          className="w-50"
                          onFocus={handlePutPriceFocus}
                          onBlur={handlePutPriceBlur}
                        />
                        <Button
                          onClick={() =>
                            handleBuyOption("put", "LIMIT", putPrice, atmPut.symbol)
                          }
                          className="w-30"
                          disabled={
                            isLoading.buyOrder || tradeMode === "no-trade" || tradeMode === "call"
                          }
                        >
                          {isLoading.buyOrder ? "Buying..." : "Buy Put"}
                        </Button>
                        <Checkbox
                          id="putBof"
                          checked={putBofEnabled}
                          onCheckedChange={setPutBofEnabled}
                        />
                        <label htmlFor="putBof" className="text-sm font-medium leading-none">
                          BOF
                        </label>
                      </div>
                    </TabsContent>
                    {/* Repeat STOP_LOSS and SL blocks... */}

                    {/* PUT Tabs Switcher */}
                    <TabsList className="grid w-full grid-cols-3 mt-4">
                      <TabsTrigger value="SL">SL</TabsTrigger>
                      <TabsTrigger value="LIMIT">Limit</TabsTrigger>
                      <TabsTrigger value="STOP_LOSS">Stop Limit</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

  )
}

export default OptionTradingPanel
