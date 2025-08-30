import React from "react"
import { Button } from "@/components/ui/button"
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
import { RefreshCw, LogOut } from "lucide-react"
import { TradeModeSelector } from "@/components/TradeModeSelector"
import { TradePlanPopup } from "@/components/trade-plan-popup"
import { EconomicCalendarPopup } from "@/components/economic-calendar"

interface NavbarProps {
  tradeMode: "no-trade" | "call" | "put"
  onTradeModeChange: (mode: "no-trade" | "call" | "put") => void
  setCurrentTab: (tab: "call" | "put") => void
  timerLeft: string | null
  isLoading: {
    refreshTrade: boolean
    [key: string]: boolean
  }
  handleRefreshTrade: () => void
  isEndSessionOpen: boolean
  setIsEndSessionOpen: (open: boolean) => void
  handleEndSession: () => Promise<void>
}

export const Navbar: React.FC<NavbarProps> = ({
  tradeMode,
  onTradeModeChange,
  setCurrentTab,
  timerLeft,
  isLoading,
  handleRefreshTrade,
  isEndSessionOpen,
  setIsEndSessionOpen,
  handleEndSession,
}) => {
  return (
    <header className="flex items-center h-20 border-b px-3">
      <div className="flex-grow flex items-center">
        <TradeModeSelector 
          tradeMode={tradeMode} 
          onTradeModeChange={onTradeModeChange} 
          setCurrentTab={setCurrentTab}
        />
      </div>
      <div className="flex-shrink-0 mx-4">
        {timerLeft && timerLeft !== "00:00" && (
          <div className="h-full flex items-center px-3 bg-yellow-100 text-yellow-800">
            <span className="font-mono ml-1">Next order in: {timerLeft}</span>
          </div>
        )}
      </div>
      <div className="flex-shrink-0 flex space-x-2">
        <div className="sm:block hidden">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleRefreshTrade}
            disabled={isLoading.refreshTrade}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading.refreshTrade ? "animate-spin" : ""}`} />
            <span className="sr-only">Refresh Trade</span>
          </Button>
          <EconomicCalendarPopup />
          <TradePlanPopup />
        </div>
        <AlertDialog open={isEndSessionOpen} onOpenChange={setIsEndSessionOpen}>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
              <LogOut className="h-4 w-4 mr-1" />
              End Session
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>This action will end your current trading session.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleEndSession}>End Session</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </header>
  )
}