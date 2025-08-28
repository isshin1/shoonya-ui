import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

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
                        <DropdownMenuItem onClick={() => onCancelOrder(order.orderId)}>
                          Cancel Order
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onModifyOrder(order)}>
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
  )
}