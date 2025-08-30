import { Inter } from 'next/font/google'
import { Toaster } from '@/components/ui/toaster'
import { SidebarProvider } from '@/components/ui/sidebar'
import './globals.css'
import { metadata } from './metadata'
import { SessionProvider } from "@/app/contexts/SessionContext";
import { CustomToaster } from "@/components/custom-toaster";

export { metadata }

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <SessionProvider>
          <SidebarProvider>
            {children}
            <Toaster />
          </SidebarProvider>
        </SessionProvider>

      </body>
    </html>
  )
}

