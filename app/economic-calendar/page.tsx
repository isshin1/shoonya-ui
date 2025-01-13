/// <reference types="react/experimental" />
'use client'
import  React , { useState, useEffect } from 'react';

import { AppSidebar } from '@/components/app-sidebar'
import { SidebarInset } from '@/components/ui/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
type EconomicEvent = {
  date: string
  time: string
  event: string
  impact: 'low' | 'medium' | 'high'
}

const EconomicCalendar: React.FC = () => {
  const [events, setEvents] = useState<EconomicEvent[]>([])

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

export default EconomicCalendar;

