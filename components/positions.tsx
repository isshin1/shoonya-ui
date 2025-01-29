import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'


type Position = {
  id: string
  tsym: string
  type: 'call' | 'put'
  daybuyavgprc: string
  totsellavgprc: string
  currentPrice: string
  exitPrice: string
  daybuyqty: string
  netqty: string
  status: 'active' | 'closed'
  [key: string]: any  // Add this line to allow additional properties
}

interface PositionsCardProps {
  positions: Position[]
}

export function PositionsCard({ positions }: PositionsCardProps) {
  return (
    <Card className="h-[200px] overflow-y-auto">
      {/* <CardHeader className="p-2">
        <CardTitle>Positions</CardTitle>
      </CardHeader> */}
      <CardContent className="p-2 text-sm">
        <Tabs defaultValue="active" className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="active">Active Positions</TabsTrigger>
            <TabsTrigger value="closed">Closed Positions</TabsTrigger>
          </TabsList>
          <TabsContent value="active" className="flex-grow overflow-y-auto">
            <div className="space-y-2">
              {positions.filter(p => p.netqty !== '0').map(position => (
                <div key={position.id} className="flex justify-between items-center bg-secondary rounded-md p-2">
                  <span className="font-bold">{position.tsym}</span>
                  <span>Qty: {position.netqty}</span>
                  <span>Avg: ₹{parseFloat(position.daybuyavgprc).toFixed(2)}</span>
                  <span>LTP: ₹{parseFloat(position.currentPrice).toFixed(2)}</span>
                  <span className={parseFloat(position.currentPrice) > parseFloat(position.daybuyavgprc) ? "text-green-500" : "text-red-500"}>
                    P&L: ₹{((parseFloat(position.currentPrice) - parseFloat(position.daybuyavgprc)) * parseFloat(position.netqty)).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="closed" className="flex-grow overflow-y-auto">
            <div className="space-y-2">
              {positions.filter(p => p.netqty === '0').map(position => (
                <div key={position.id} className="flex justify-between items-center bg-muted rounded-md p-2">
                  <span className="font-bold">{position.tsym}</span>
                  <span>Qty: {position.daybuyqty}</span>
                  <span>Entry: ₹{parseFloat(position.daybuyavgprc).toFixed(2)}</span>
                  <span>Exit: ₹{parseFloat(position.totsellavgprc).toFixed(2)}</span>
                  <span className={parseFloat(position.totsellavgprc) > parseFloat(position.daybuyavgprc) ? "text-green-500" : "text-red-500"}>
                    P&L: ₹{((parseFloat(position.totsellavgprc) - parseFloat(position.daybuyavgprc)) * parseFloat(position.daybuyqty)).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

