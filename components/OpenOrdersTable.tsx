import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { MoreVertical, TrendingUp, TrendingDown } from "lucide-react"

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

interface OpenOrdersTableProps {
  openOrders: OpenOrder[]
  onCancelOrder: (norenordno: string) => void
  onModifyOrder: (order: OpenOrder) => void
}

export const OpenOrdersTable: React.FC<OpenOrdersTableProps> = ({
  openOrders,
  onCancelOrder,
  onModifyOrder,
}) => {


  return (
    <Card className="shadow-lg border-0 bg-white w-full h-full rounded-none">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-100 p-3">
        <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
          Open Orders
          <span className="ml-auto text-xs font-normal text-gray-500 bg-blue-100 px-2 py-0.5 rounded-full">
            {openOrders.length} active
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full space-x-4">
            <thead>
              <tr className="bg-gray-50/50 hover:bg-gray-50/80 border-b border-gray-200">
                <th className="font-semibold text-gray-700 py-4 px-6 text-left">Symbol</th>
                <th className="font-semibold text-gray-700 py-4 text-left">Order Price</th>
                <th className="font-semibold text-gray-700 py-4 text-left">Quantity</th>
                <th className="font-semibold text-gray-700 py-4 text-left">Type</th>
                <th className="font-semibold text-gray-700 py-4 text-left">P&L</th>
                <th className="font-semibold text-gray-700 py-4 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {openOrders.map((order, index) => {
                const pnl = (parseFloat(order.currentTradingPrice) - parseFloat(order.price)) * parseFloat(order.quantity)
                const pnlPercentage = ((parseFloat(order.currentTradingPrice) - parseFloat(order.price)) / parseFloat(order.price)) * 100
                const isProfit = pnl > 0
                
                return (
                  <tr 
                    key={order.norenordno} 
                    className="hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-b-0"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${order.transactionType === "BUY" ? "bg-green-100" : "bg-red-100"}`}>
                          {order.transactionType === "BUY" ? 
                            <TrendingUp className="w-4 h-4 text-green-600" /> : 
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          }
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{order.tradingSymbol}</div>
                          <div className={`text-xs font-medium ${order.transactionType === "BUY" ? "text-green-600" : "text-red-600"}`}>
                            {order.transactionType}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">₹{parseFloat(order.price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        <span className="text-xs text-gray-500">
                          LTP: ₹{parseFloat(order.currentTradingPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="font-medium text-gray-900">{order.quantity}</span>
                    </td>
                    <td className="py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        order.orderType === "LIMIT" 
                          ? "bg-blue-100 text-blue-700" 
                          : "bg-orange-100 text-orange-700"
                      }`}>
                        {order.orderType}
                      </span>
                    </td>
                    <td className="py-4">
                      <div className="flex flex-col">
                        <span className={`font-semibold ${isProfit ? "text-green-600" : "text-red-600"}`}>
                          {isProfit ? "+" : ""}₹{pnl.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                        <span className={`text-xs ${isProfit ? "text-green-500" : "text-red-500"}`}>
                          ({isProfit ? "+" : ""}{pnlPercentage.toFixed(2)}%)
                        </span>
                      </div>
                    </td>
                    <td className="py-4 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            className="h-9 w-9 p-0 hover:bg-gray-100 rounded-full"
                          >
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4 text-gray-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem 
                            onClick={() => onModifyOrder(order)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            Modify Order
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => onCancelOrder(order.orderId)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            Cancel Order
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                )
              })}
              {openOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center gap-3">
                      {/* <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                        <TrendingUp className="w-8 h-8 text-gray-400" />
                      </div> */}
                      <div className="text-gray-500 font-medium">No active orders</div>
                      <div className="text-gray-400 text-sm">Your open orders will appear here</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}