'use client'

import { useState, useEffect } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import { SidebarInset } from '@/components/ui/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

type EconomicEvent = {
  date: string
  time: string
  event: string
  impact: 'low' | 'medium' | 'high'
}

export default function EconomicCalendar() {
  const [events, setEvents] = useState<EconomicEvent[]>([])

  useEffect(() => {
    // Fetch economic events from RSS feed
    // This is a placeholder, replace with actual API call
    setEvents([
      { date: '2023-07-21', time: '08:30', event: 'US Jobless Claims', impact: 'medium' },
      { date: '2023-07-21', time: '10:00', event: 'Existing Home Sales', impact: 'low' },
      { date: '2023-07-22', time: '09:45', event: 'US Manufacturing PMI', impact: 'high' },
    ])
  }, [])

  return (
    <div className="flex h-screen">
      <AppSidebar />
      <SidebarInset className="flex flex-col p-4">
        <Card>
          <CardHeader>
            <CardTitle>Economic Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            <iframe
              title="cEconomic calendar"
              src="https://sslecal2.investing.com?columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&category=_employment,_economicActivity,_inflation,_credit,_centralBanks,_confidenceIndex,_balance,_Bonds&importance=3&features=datepicker,timezone,timeselector,filters&countries=14,35,5&calType=week&timeZone=23&lang=56"              
              width="650"
              height="557"
            ></iframe>
            <div style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
              <span style={{ fontSize: '11px', color: '#333333', textDecoration: 'none' }}>
                Real Time Economic Calendar provided by{' '}
                <a
                  href="https://in.Investing.com/"
                  rel="nofollow"
                  target="_blank"
                  style={{ fontSize: '11px',  fontWeight: 'bold' }}
                >
                  Investing.com India
                </a>
                .
              </span>
            </div>
          </CardContent>
        </Card>
      </SidebarInset>
    </div>
  )
}