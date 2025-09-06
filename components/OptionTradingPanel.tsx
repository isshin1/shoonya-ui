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
  atmFuture: { symbol: string; price: number; token: number } // Updated to include price
  currentTab: "fut" | "call" | "put"
  setCurrentTab: (tab: "fut" | "call" | "put") => void
  convertString: (s: string) => string
  callPrice: number
  putPrice: number
  futPrice: number
  setCallPrice: (p: number) => void
  setPutPrice: (p: number) => void
  setFutPrice: (p: number) => void
  isLoading: { buyOrder: boolean }
  tradeMode: "fut" | "call" | "put"
  orderType: "LIMIT" | "STOP_LOSS" | "SL"
  setOrderType: (type: "LIMIT" | "STOP_LOSS" | "SL") => void
  callBofEnabled: boolean
  setCallBofEnabled: (checked: boolean) => void
  putBofEnabled: boolean
  setPutBofEnabled: (checked: boolean) => void
  futBofEnabled: boolean
  setFutBofEnabled: (checked: boolean) => void
  handleBuyOption: (
    side: "call" | "put" | "fut",
    orderType: OrderType,
    price: number,
    symbol: string
  ) => void
  handleCallPriceFocus: () => void
  handleCallPriceBlur: () => void
  handlePutPriceFocus: () => void
  handlePutPriceBlur: () => void
  handleFutPriceFocus: () => void
  handleFutPriceBlur: () => void
  openOrders: any[]
  handleCancelOrderWrapper: (id: string) => void
  setSelectedOrder: (order: any) => void
  setNewPrice: (p: number) => void
  setIsModifyOrderOpen: (open: boolean) => void
}

const OptionTradingPanel: React.FC<OptionTradingPanelProps> = ({
  atmCall,
  atmPut,
  atmFuture,
  currentTab,
  setCurrentTab,
  convertString,
  callPrice,
  setCallPrice,
  putPrice,
  setPutPrice,
  futPrice,
  setFutPrice,
  isLoading,
  tradeMode,
  orderType,
  setOrderType,
  callBofEnabled,
  setCallBofEnabled,
  putBofEnabled,
  setPutBofEnabled,
  futBofEnabled,
  setFutBofEnabled,
  handleBuyOption,
  handleCallPriceFocus,
  handleCallPriceBlur,
  handlePutPriceFocus,
  handlePutPriceBlur,
  handleFutPriceFocus,
  handleFutPriceBlur,
  openOrders,
  handleCancelOrderWrapper,
  setSelectedOrder,
  setNewPrice,
  setIsModifyOrderOpen
}) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-semibold text-sm">Option Trading</CardTitle>
      </CardHeader>
      <CardContent className="p-4 text-sm">
        {/* Main Fut/Call/Put Tabs */}
        <Tabs
          value={currentTab}
          className="h-full flex flex-col"
          onValueChange={(value) => setCurrentTab(value as "fut" | "call" | "put")}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="fut">
              {atmFuture.symbol || "Future"}
            </TabsTrigger>
            <TabsTrigger value="call">
              {convertString(atmCall.symbol) || "Call"}
            </TabsTrigger>
            <TabsTrigger value="put">
              {convertString(atmPut.symbol) || "put"}
            </TabsTrigger>
          </TabsList>

          {/* -------- FUTURE Section -------- */}
          <TabsContent value="fut" className="flex-grow">
            <div className="space-y-4">
              <Tabs
                defaultValue="LIMIT"
                className="w-full"
                onValueChange={(value) => setOrderType(value as any)}
              >
                <div className="text-sm text-gray-500 mb-2">
                  Latest price: ₹{atmFuture.price ? atmFuture.price.toFixed(2) : "Loading..."}
                </div>

                {/* FUTURE Limit */}
                <TabsContent value="LIMIT" className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Input
                      id="futPrice"
                      type="number"
                      value={futPrice}
                      onChange={(e) => setFutPrice(Number(e.target.value))}
                      placeholder="Enter limit price"
                      className="w-50"
                      onFocus={handleFutPriceFocus}
                      onBlur={handleFutPriceBlur}
                    />
                    <Button
                      onClick={() =>
                        handleBuyOption("fut", orderType, futPrice, atmFuture.symbol)
                      }
                      className="w-30"
                      disabled={
                        isLoading.buyOrder  || (tradeMode !== "fut" && tradeMode !== "call" && tradeMode !== "put")
                      }
                    >
                      {isLoading.buyOrder ? "Buying..." : "Buy Future"}
                    </Button>
                    <Checkbox
                      id="futBof"
                      checked={futBofEnabled}
                      onCheckedChange={setFutBofEnabled}
                    />
                    <label htmlFor="futBof" className="text-sm font-medium leading-none">
                      BOF
                    </label>
                  </div>
                </TabsContent>

                {/* FUTURE Stop Loss */}
                <TabsContent value="STOP_LOSS" className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Input
                      id="futPriceStopLoss"
                      type="number"
                      value={futPrice}
                      onChange={(e) => setFutPrice(Number(e.target.value))}
                      placeholder="Enter stop loss price"
                      className="w-50"
                      onFocus={handleFutPriceFocus}
                      onBlur={handleFutPriceBlur}
                    />
                    <Button
                      onClick={() =>
                        handleBuyOption("fut", "STOP_LOSS", futPrice, atmFuture.symbol)
                      }
                      className="w-30"
                      disabled={
                        isLoading.buyOrder  || (tradeMode !== "fut" && tradeMode !== "call" && tradeMode !== "put")
                      }
                    >
                      {isLoading.buyOrder ? "Buying..." : "Buy Future"}
                    </Button>
                    <Checkbox
                      id="futBofStopLoss"
                      checked={futBofEnabled}
                      onCheckedChange={setFutBofEnabled}
                    />
                    <label htmlFor="futBofStopLoss" className="text-sm font-medium leading-none">
                      BOF
                    </label>
                  </div>
                </TabsContent>

                {/* FUTURE SL */}
                <TabsContent value="SL" className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Input
                      id="futPriceSL"
                      type="number"
                      value={futPrice}
                      onChange={(e) => setFutPrice(Number(e.target.value))}
                      placeholder="Enter SL price"
                      className="w-50"
                      onFocus={handleFutPriceFocus}
                      onBlur={handleFutPriceBlur}
                    />
                    <Button
                      onClick={() =>
                        handleBuyOption("fut", "SL", futPrice, atmFuture.symbol)
                      }
                      className="w-30"
                      disabled={
                        isLoading.buyOrder || (tradeMode !== "fut" && tradeMode !== "call" && tradeMode !== "put")
                      }
                    >
                      {isLoading.buyOrder ? "Buying..." : "Buy Future"}
                    </Button>
                    <Checkbox
                      id="futBofSL"
                      checked={futBofEnabled}
                      onCheckedChange={setFutBofEnabled}
                    />
                    <label htmlFor="futBofSL" className="text-sm font-medium leading-none">
                      BOF
                    </label>
                  </div>
                </TabsContent>

                {/* FUTURE Tabs Switcher */}
                <TabsList className="grid w-full grid-cols-3 mt-4">
                  <TabsTrigger value="SL">SL</TabsTrigger>
                  <TabsTrigger value="LIMIT">Limit</TabsTrigger>
                  <TabsTrigger value="STOP_LOSS">Stop Limit</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </TabsContent>

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
                        isLoading.buyOrder || tradeMode === "put"
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

                {/* CALL Stop Loss */}
                <TabsContent value="STOP_LOSS" className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Input
                      id="callPriceStopLoss"
                      type="number"
                      value={callPrice}
                      onChange={(e) => setCallPrice(Number(e.target.value))}
                      placeholder="Enter stop loss price"
                      className="w-50"
                      onFocus={handleCallPriceFocus}
                      onBlur={handleCallPriceBlur}
                    />
                    <Button
                      onClick={() =>
                        handleBuyOption("call", "STOP_LOSS", callPrice, atmCall.symbol)
                      }
                      className="w-30"
                      disabled={
                        isLoading.buyOrder ||  tradeMode === "put"
                      }
                    >
                      {isLoading.buyOrder ? "Buying..." : "Buy Call"}
                    </Button>
                    <Checkbox
                      id="callBofStopLoss"
                      checked={callBofEnabled}
                      onCheckedChange={setCallBofEnabled}
                    />
                    <label htmlFor="callBofStopLoss" className="text-sm font-medium leading-none">
                      BOF
                    </label>
                  </div>
                </TabsContent>

                {/* CALL SL */}
                <TabsContent value="SL" className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Input
                      id="callPriceSL"
                      type="number"
                      value={callPrice}
                      onChange={(e) => setCallPrice(Number(e.target.value))}
                      placeholder="Enter SL price"
                      className="w-50"
                      onFocus={handleCallPriceFocus}
                      onBlur={handleCallPriceBlur}
                    />
                    <Button
                      onClick={() =>
                        handleBuyOption("call", "SL", callPrice, atmCall.symbol)
                      }
                      className="w-30"
                      disabled={
                        isLoading.buyOrder ||  tradeMode === "put"
                      }
                    >
                      {isLoading.buyOrder ? "Buying..." : "Buy Call"}
                    </Button>
                    <Checkbox
                      id="callBofSL"
                      checked={callBofEnabled}
                      onCheckedChange={setCallBofEnabled}
                    />
                    <label htmlFor="callBofSL" className="text-sm font-medium leading-none">
                      BOF
                    </label>
                  </div>
                </TabsContent>

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
                        isLoading.buyOrder ||  tradeMode === "call"
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

                {/* PUT Stop Loss */}
                <TabsContent value="STOP_LOSS" className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Input
                      id="putPriceStopLoss"
                      type="number"
                      value={putPrice}
                      onChange={(e) => setPutPrice(Number(e.target.value))}
                      placeholder="Enter stop loss price"
                      className="w-50"
                      onFocus={handlePutPriceFocus}
                      onBlur={handlePutPriceBlur}
                    />
                    <Button
                      onClick={() =>
                        handleBuyOption("put", "STOP_LOSS", putPrice, atmPut.symbol)
                      }
                      className="w-30"
                      disabled={
                        isLoading.buyOrder ||  tradeMode === "call"
                      }
                    >
                      {isLoading.buyOrder ? "Buying..." : "Buy Put"}
                    </Button>
                    <Checkbox
                      id="putBofStopLoss"
                      checked={putBofEnabled}
                      onCheckedChange={setPutBofEnabled}
                    />
                    <label htmlFor="putBofStopLoss" className="text-sm font-medium leading-none">
                      BOF
                    </label>
                  </div>
                </TabsContent>

                {/* PUT SL */}
                <TabsContent value="SL" className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Input
                      id="putPriceSL"
                      type="number"
                      value={putPrice}
                      onChange={(e) => setPutPrice(Number(e.target.value))}
                      placeholder="Enter SL price"
                      className="w-50"
                      onFocus={handlePutPriceFocus}
                      onBlur={handlePutPriceBlur}
                    />
                    <Button
                      onClick={() =>
                        handleBuyOption("put", "SL", putPrice, atmPut.symbol)
                      }
                      className="w-30"
                      disabled={
                        isLoading.buyOrder ||  tradeMode === "call"
                      }
                    >
                      {isLoading.buyOrder ? "Buying..." : "Buy Put"}
                    </Button>
                    <Checkbox
                      id="putBofSL"
                      checked={putBofEnabled}
                      onCheckedChange={setPutBofEnabled}
                    />
                    <label htmlFor="putBofSL" className="text-sm font-medium leading-none">
                      BOF
                    </label>
                  </div>
                </TabsContent>

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