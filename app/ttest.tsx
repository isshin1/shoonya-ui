'use client'
import { API_BASE_URL } from '@/utils/env';
import axios from 'axios';
import { useState, useEffect, useCallback } from 'react'
import { useToast } from "@/components/ui/use-toast"
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Resizable } from '@/components/resizable'
import { createChart, ColorType } from 'lightweight-charts';

type Position = {
  id: string
  symbol: string
  type: 'call' | 'put'
  entryPrice: number
  currentPrice: number
  quantity: number
  status: 'active' | 'closed'
}

type OpenOrder = {
  id: string
  symbol: string
  price: number
  quantity: number
  currentTradingPrice: number
  status: 'Limit' | 'SL-LMT'
}

type CandlestickData = {
  time: number
  open: number
  high: number
  low: number
  close: number
}

export default function Home() {
  const [positions, setPositions] = useState<Position[]>([])
  const [openOrders, setOpenOrders] = useState<OpenOrder[]>([])
  const [atmCall, setAtmCall] = useState({ price: 0, symbol: '', latestPrice: 0 })
  const [atmPut, setAtmPut] = useState({ price: 0, symbol: '', latestPrice: 0 })
  const [isAddMoneyOpen, setIsAddMoneyOpen] = useState(false)
  const [isEndSessionOpen, setIsEndSessionOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [callPrice, setCallPrice] = useState('')
  const [putPrice, setPutPrice] = useState('')
  const [chartData, setChartData] = useState<CandlestickData[]>([])
  const [interval, setInterval] = useState<'1m' | '3m'>('1m')

  const { toast } = useToast()

  const endSession = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/withdrawFunds`);
      console.log(response.status);
      if (response.status === 200) {
        toast({
          title: "Money Withdrawn",
          description: "Your trading session has been successfully ended.",
        });
        setIsEndSessionOpen(false);
      } else {
        throw new Error('Failed to end session');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to end session. Please try again.",
        variant: "destructive",
      });
    }
  };

  const addMoney = async () => {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/addFunds/${amount}`);
      console.log(response.status);
      if (response.status === 200) {
        toast({
          title: "Request Sent",
          description: `Sent request for ₹${amount} to be added via upi`,
        });
        
      setIsAddMoneyOpen(false)
      setAmount('')
      } else {
        throw new Error('Failed to end session');
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to send add fund request. Please try again.",
        variant: "destructive",
      });
    }
  };

  const buyOption = (type: 'call' | 'put') => {
    const price = type === 'call' ? callPrice : putPrice
    toast({
      title: "Option Purchased",
      description: `You have purchased a ${type} option for $${price}.`,
    })
    // Implement the actual purchase logic here
  }

  const generateCandlestickData = useCallback((intervalMinutes: number) => {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 99 * intervalMinutes * 60000);
    return Array.from({ length: 100 }, (_, i) => {
      const date = new Date(startDate.getTime() + i * intervalMinutes * 60000);
      const open = Math.random() * 10 + 100;
      const close = Math.random() * 10 + 100;
      return {
        time: Math.floor(date.getTime() / 1000),
        open,
        high: Math.max(open, close) + Math.random() * 2,
        low: Math.min(open, close) - Math.random() * 2,
        close,
      };
    });
  }, []);

  useEffect(() => {
    // Fetch positions, ATM call and put options
    setPositions([
      { id: '1', symbol: 'AAPL', type: 'call', entryPrice: 150, currentPrice: 155, quantity: 1, status: 'active' },
      { id: '2', symbol: 'GOOGL', type: 'put', entryPrice: 2800, currentPrice: 2750, quantity: 1, status: 'active' },
      { id: '3', symbol: 'MSFT', type: 'call', entryPrice: 300, currentPrice: 310, quantity: 1, status: 'closed' },
    ])
    setAtmCall({ price: 5.50, symbol: 'AAPL230721C00150000', latestPrice: 5.55 })
    setAtmPut({ price: 4.75, symbol: 'AAPL230721P00150000', latestPrice: 4.70 })
    setOpenOrders([
      { id: '1', symbol: 'NIFTY 23500 CE', price: 3.50, quantity: 10, currentTradingPrice: 3.55, status: 'Limit' },
      { id: '2', symbol: 'NIFTY 23500 PE', price: 15.00, quantity: 5, currentTradingPrice: 14.80, status: 'SL-LMT' },
    ])
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setOpenOrders(prevOrders => 
        prevOrders.map(order => ({
          ...order,
          currentTradingPrice: +(order.currentTradingPrice + (Math.random() - 0.5) * 0.1).toFixed(2)
        }))
      )
    }, 2000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const intervalMinutes = interval === '1m' ? 1 : 3;
    const newData = generateCandlestickData(intervalMinutes);
    setChartData(newData);
  }, [interval, generateCandlestickData]);

  useEffect(() => {
    const chartContainer = document.getElementById('chart-container');
    if (chartContainer) {
      const chart = createChart(chartContainer, {
        width: chartContainer.clientWidth,
        height: chartContainer.clientHeight,
        layout: {
          background: { type: ColorType.Solid, color: 'white' },
          textColor: 'black',
        },
        grid: {
          vertLines: { color: '#e0e0e0' },
          horzLines: { color: '#e0e0e0' },
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
        },
      });

      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });

      candlestickSeries.setData(chartData);

      const handleResize = () => {
        chart.applyOptions({
          width: chartContainer.clientWidth,
          height: chartContainer.clientHeight,
        });
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        chart.remove();
      };
    }
  }, [chartData]);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <AppSidebar />
      <SidebarInset className="flex flex-col w-full">
        <header className="flex justify-between items-center p-4 border-b">
          <SidebarTrigger />
          <div className="flex space-x-2">
            <Dialog open={isAddMoneyOpen} onOpenChange={setIsAddMoneyOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Add Money</Button>
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
                <Button onClick={addMoney}>Confirm</Button>
              </DialogContent>
            </Dialog>
            <AlertDialog open={isEndSessionOpen} onOpenChange={setIsEndSessionOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">End Session</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action will end your current trading session.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={endSession}>End Session</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </header>
        <div className="flex-1 p-4 w-full h-[calc(100vh-4rem)] overflow-hidden">
          <Resizable defaultSize={75} minSize={50} maxSize={90}>
            <Card className="h-full overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>AAPL</CardTitle>
                <div className="flex space-x-2">
                  <Button
                    variant={interval === '1m' ? 'default' : 'outline'}
                    onClick={() => setInterval('1m')}
                  >
                    1m
                  </Button>
                  <Button
                    variant={interval === '3m' ? 'default' : 'outline'}
                    onClick={() => setInterval('3m')}
                  >
                    3m
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="h-[calc(100%-4rem)]">
                <div id="chart-container" className="w-full h-full" />
              </CardContent>
            </Card>
            <div className="flex flex-col h-full space-y-4 overflow-y-auto text-sm">
              <Card className="flex-shrink-0">
                <CardHeader className="p-4">
                  <CardTitle>{atmCall.symbol.split('C')[0]}</CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-sm">
                  <Tabs defaultValue="call" className="h-full flex flex-col">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="call">Call</TabsTrigger>
                      <TabsTrigger value="put">Put</TabsTrigger>
                    </TabsList>
                    <TabsContent value="call" className="flex-grow">
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="callPrice" className="block text-sm font-medium text-gray-700">
                            Price
                          </label>
                          <Input
                            id="callPrice"
                            type="number"
                            value={callPrice}
                            onChange={(e) => setCallPrice(e.target.value)}
                            placeholder="Enter price"
                          />
                        </div>
                        <Button onClick={() => buyOption('call')} className="w-full">
                          Buy Call
                        </Button>
                        <div className="text-sm text-gray-500">
                          Latest price: ${atmCall.latestPrice.toFixed(2)}
                        </div>
                      </div>
                    </TabsContent>
                    <TabsContent value="put" className="flex-grow">
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="putPrice" className="block text-sm font-medium text-gray-700">
                            Price
                          </label>
                          <Input
                            id="putPrice"
                            type="number"
                            value={putPrice}
                            onChange={(e) => setPutPrice(e.target.value)}
                            placeholder="Enter price"
                          />
                        </div>
                        <Button onClick={() => buyOption('put')} className="w-full">
                          Buy Put
                        </Button>
                        <div className="text-sm text-gray-500">
                          Latest price: ${atmPut.latestPrice.toFixed(2)}
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
              <Card className="flex-shrink-0">
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
                        <TableHead>Current</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {openOrders.map((order) => (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">{order.symbol}</TableCell>
                          <TableCell>${order.price.toFixed(2)}</TableCell>
                          <TableCell>{order.quantity}</TableCell>
                          <TableCell>${order.currentTradingPrice.toFixed(2)}</TableCell>
                          <TableCell>{order.status}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              <Card className="flex-shrink-0">
                <CardHeader className="p-4">
                  <CardTitle>Positions</CardTitle>
                </CardHeader>
                <CardContent className="p-4 text-sm">
                  <Tabs defaultValue="active" className="h-full flex flex-col">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="active">Active</TabsTrigger>
                      <TabsTrigger value="closed">Closed</TabsTrigger>
                    </TabsList>
                    <TabsContent value="active" className="flex-grow">
                      {positions.filter(p => p.status === 'active').map(position => (
                        <div key={position.id} className="mb-2 p-2 bg-secondary rounded-md">
                          <p className="font-bold">{position.symbol} {position.type.toUpperCase()}</p>
                          <p>Entry: ${position.entryPrice}</p>
                          <p>Current: ${position.currentPrice}</p>
                          <p>Quantity: {position.quantity}</p>
                        </div>
                      ))}
                    </TabsContent>
                    <TabsContent value="closed" className="flex-grow">
                      {positions.filter(p => p.status === 'closed').map(position => (
                        <div key={position.id} className="mb-2 p-2 bg-muted rounded-md">
                          <p className="font-bold">{position.symbol} {position.type.toUpperCase()}</p>
                          <p>Entry: ${position.entryPrice}</p>
                          <p>Exit: ${position.currentPrice}</p>
                          <p>Quantity: {position.quantity}</p>
                        </div>
                      ))}
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>
          </Resizable>
        </div>
      </SidebarInset>
    </div>
  )
}

