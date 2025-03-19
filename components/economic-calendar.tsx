"use client"

import { useState } from "react"
import { Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"

export function EconomicCalendarPopup() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9" aria-label="Economic Calendar">
          <Calendar className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Economic Calendar</DialogTitle>
        </DialogHeader>
        <Card className="border-0 shadow-none">
          <CardContent className="p-0">
            <iframe
              title="Economic calendar"
              src="https://sslecal2.investing.com?columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&category=_employment,_economicActivity,_inflation,_credit,_centralBanks,_confidenceIndex,_balance,_Bonds&importance=3&features=datepicker,timezone,timeselector,filters&countries=14,35,5&calType=week&timeZone=23&lang=56"
              width="100%"
              height="600"
              frameBorder="0"
              className="w-full"
            ></iframe>
            <div className="text-xs text-gray-500 mt-2 text-center">
              Real Time Economic Calendar provided by{" "}
              <a
                href="https://in.Investing.com/"
                rel="noreferrer nofollow"
                target="_blank"
                className="font-bold text-primary"
              >
                Investing.com India
              </a>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  )
}

