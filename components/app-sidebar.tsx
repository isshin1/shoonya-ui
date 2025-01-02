import React from 'react'
import { Home, Calendar, DollarSign } from 'lucide-react'
import Link from 'next/link'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarTrigger
} from '@/components/ui/sidebar'

const navItems = [
  { title: 'Main', icon: Home, href: '/' },
  { title: 'Economic Calendar', icon: Calendar, href: '/economic-calendar' },
  { title: 'PnL Calendar', icon: DollarSign, href: '/pnl-calendar' },
]

export function AppSidebar() {
  return (
    <Sidebar className="h-[calc(100vh-4rem)] border-r" collapsible="icon" defaultWidth="16rem" collapsedWidth="4rem">
      <SidebarHeader >
        <SidebarTrigger className=" w-8 h-8" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="w-full justify-start">
                    <Link href={item.href} className="flex items-center">
                      <item.icon className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="flex-grow">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
