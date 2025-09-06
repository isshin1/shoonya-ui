import React, {useState, useEffect, useRef} from "react";

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
import { RefreshCw, LogOut, Menu, Pin } from "lucide-react"
import { TradeModeSelector } from "@/components/TradeModeSelector"
import { TradePlanPopup } from "@/components/trade-plan-popup"
import { EconomicCalendarPopup } from "@/components/economic-calendar"
import { AuthDialog } from "./AuthDialog";
import { useSession } from "@/app/contexts/SessionContext";
import toast from "react-hot-toast";

interface NavbarProps {
  tradeMode: "fut" | "call" | "put"
  onTradeModeChange: (mode: "fut" | "call" | "put") => void
  setCurrentTab: (tab: "fut"  | "call" | "put" ) => void;

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
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { session, logout } = useSession();

    
  useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
          if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
              setIsMenuOpen(false);
          }
      };
      if (isMenuOpen) {
          document.addEventListener("mousedown", handleClickOutside);
      }
      return () => {
          document.removeEventListener("mousedown", handleClickOutside);
      };
  }, [isMenuOpen]);

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
        <div className="relative flex-shrink-0" ref={menuRef}>
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsMenuOpen(prev => !prev)}
                className="h-8 w-8 sm:h-9 sm:w-9"
            >
                <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-xl ring-0 ring-green ring-opacity-0 focus:outline-none z-5000">
                {/* {pathname !== "/" && (
                    <Link
                        href="/"
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsMenuOpen(false)}
                    >
                        Go to Home
                    </Link>
                )} */}
                {session.isLoggedIn ? (
                  <div className="relative w-full">
                      <button
                          onClick={() => {
                          logout();
                          setIsMenuOpen(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                          Logout
                      </button>
                      
                      <div
                      className="absolute top-0 left-4 right-4"
                      style={{
                          height: '1px',
                          backgroundColor: 'rgba(0, 0, 0, 0.1)',
                          boxShadow: 'none',
                      }}
                      />
                  </div>
                ) : (
                    <button
                        onClick={() => {
                            toast.success("login pressed")
                            setIsAuthDialogOpen(true);
                            setIsMenuOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                        Login / Sign Up
                    </button>
                )}
            </div>
          )}
        </div>
        <AlertDialog open={isEndSessionOpen} onOpenChange={setIsEndSessionOpen}>
          <AlertDialogTrigger asChild>
            {/* <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
              <LogOut className="h-4 w-4 mr-1" />
              End Session
            </Button> */}
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
      <AuthDialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen} />
    </header>
    
  )
}