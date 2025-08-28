'use client'
import { API_BASE_URL } from '@/utils/env';

import { useState, useEffect } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarInset } from '@/components/ui/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { CalendarIcon } from 'lucide-react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, isWeekend } from 'date-fns'

type PnLData = {
  [date: string]: number
}

type ViewType = 'daily' | 'weekly' | 'monthly' | 'custom'

export default function PnLCalendar() {
  const [view, setView] = useState<ViewType>('monthly')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [pnlData, setPnlData] = useState<PnLData>({})
  const [isLoading, setIsLoading] = useState(false)

  const fetchPnLData = async (start: string, end: string) => {
    setIsLoading(true)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const limitedEnd = end > today ? today : end
      const response = await fetch(`${API_BASE_URL}/api/pnl?start=${start}&end=${limitedEnd}`)
      if (!response.ok) {
        throw new Error('Failed to fetch PnL data')
      }
      const data = await response.json()
      if (typeof data === "object" && data !== null) {
        setPnlData(data)
      } else {
        console.error("Fetched PnL data is not an object:", data)
        setPnlData({}) // Or handle accordingly
      }
    } catch (error) {
      console.error('Error fetching PnL data:', error)
      // Handle error (e.g., show a toast notification)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let startDate: Date
    let endDate: Date

    if (view === 'custom') {
      if (!customStartDate || !customEndDate) return
      startDate = parseISO(customStartDate)
      endDate = parseISO(customEndDate)
    } else if (view === 'daily') {
      startDate = currentDate
      endDate = currentDate
    } else if (view === 'weekly') {
      startDate = startOfWeek(currentDate)
      endDate = endOfWeek(currentDate)
    } else {
      startDate = startOfMonth(currentDate)
      endDate = endOfMonth(currentDate)
    }

    fetchPnLData(format(startDate, 'yyyy-MM-dd'), format(endDate, 'yyyy-MM-dd'))
  }, [view, currentDate, customStartDate, customEndDate])

  const renderCalendar = () => {
    let startDate: Date
    let endDate: Date
    const today = new Date()

    if (view === 'custom') {
      if (!customStartDate || !customEndDate) {
        return { calendarJSX: null, days: [] }
      }
      startDate = parseISO(customStartDate)
      endDate = parseISO(customEndDate)
    } else if (view === 'daily') {
      startDate = currentDate
      endDate = currentDate
    } else if (view === 'weekly') {
      startDate = startOfWeek(currentDate)
      endDate = endOfWeek(currentDate)
    } else {
      startDate = startOfMonth(currentDate)
      endDate = endOfMonth(currentDate)
    }

    // Limit endDate to today
    endDate = endDate > today ? today : endDate

    const days = eachDayOfInterval({ start: startDate, end: endDate })
      .filter(date => {
        const dateString = format(date, 'yyyy-MM-dd')
        return dateString in pnlData
      })

    return {
      calendarJSX: (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {days.map((date) => {
            const dateString = format(date, 'yyyy-MM-dd')
            const pnl = pnlData[dateString] || 0
            return (
              <Card key={dateString} className="p-4">
                <CardHeader className="p-0">
                  <CardTitle className="text-sm">{format(date, 'd MMM')}</CardTitle>
                </CardHeader>
                <CardContent className="p-0 pt-2">
                  <p className={`text-lg font-bold ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{pnl}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      ),
      days: days
    }
  }

  const handlePrevious = () => {
    setCurrentDate(prevDate => {
      if (view === 'daily') return new Date(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate() - 1)
      if (view === 'weekly') return new Date(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate() - 7)
      if (view === 'monthly') return new Date(prevDate.getFullYear(), prevDate.getMonth() - 1, 1)
      return prevDate
    })
  }

  const handleNext = () => {
    setCurrentDate(prevDate => {
      if (view === 'daily') return new Date(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate() + 1)
      if (view === 'weekly') return new Date(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate() + 7)
      if (view === 'monthly') return new Date(prevDate.getFullYear(), prevDate.getMonth() + 1, 1)
      return prevDate
    })
  }

  const calculateSummary = (days: Date[]) => {
    const today = new Date()
    const relevantData = days
      .filter(day => day <= today)
      .map(day => pnlData[format(day, 'yyyy-MM-dd')] || 0)
    const totalPnl = relevantData.reduce((sum, value) => sum + value, 0)
    const bestDay = Math.max(...relevantData)
    const worstDay = Math.min(...relevantData)
    const averagePnl = relevantData.length > 0 ? totalPnl / relevantData.length : 0

    return { totalPnl, bestDay, worstDay, averagePnl }
  }

  const { calendarJSX, days } = renderCalendar()
  const summary = calculateSummary(days)

  return (
    <div className="flex h-screen">
      <AppSidebar />
      <SidebarInset className="flex flex-col p-4">
        <h1 className="text-3xl font-bold mb-4">PnL Calendar</h1>
        <div className="grid grid-cols-12 gap-4">
          <Card className="col-span-8">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center space-x-2">
                <Select value={view} onValueChange={(value: ViewType) => setView(value)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Select view" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                {view === 'custom' ? (
                  <div className="flex space-x-2">
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-[140px]"
                    />
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-[140px]"
                    />
                  </div>
                ) : (
                  <>
                    <Button variant="outline" size="icon" onClick={handlePrevious}>
                      <CalendarIcon className="h-4 w-4 rotate-180" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleNext}>
                      <CalendarIcon className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold mb-4">
                {view === 'daily' && format(currentDate > new Date() ? new Date() : currentDate, 'd MMMM yyyy')}
                {view === 'weekly' && `Week of ${format(startOfWeek(currentDate), 'd MMM')} - ${format(endOfWeek(currentDate) > new Date() ? new Date() : endOfWeek(currentDate), 'd MMM yyyy')}`}
                {view === 'monthly' && `${format(startOfMonth(currentDate), 'MMMM yyyy')}${endOfMonth(currentDate) > new Date() ? ' (Till Today)' : ''}`}
                {view === 'custom' && customStartDate && customEndDate && 
                  `${format(parseISO(customStartDate), 'd MMM yyyy')} - ${format(parseISO(customEndDate) > new Date() ? new Date() : parseISO(customEndDate), 'd MMM yyyy')}`}
              </div>
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <p>Loading...</p>
                </div>
              ) : (
                calendarJSX
              )}
            </CardContent>
          </Card>
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>PnL Summary (Trading Days Only)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">Total PnL</h3>
                  <p className={`text-2xl font-bold ${summary.totalPnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{summary.totalPnl}
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Best Day</h3>
                  <p className="text-sm text-green-600">₹{summary.bestDay}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Worst Day</h3>
                  <p className="text-sm text-red-600">₹{summary.worstDay}</p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Average Daily PnL</h3>
                  <p className="text-sm">₹{summary.averagePnl.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </div>
  )
}

