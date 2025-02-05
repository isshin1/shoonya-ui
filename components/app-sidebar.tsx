import React, { useState } from "react";
import { Home, Calendar, DollarSign } from "lucide-react";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarTrigger,
  SidebarRail,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Main", icon: Home, href: "/" },
  { title: "Economic Calendar", icon: Calendar, href: "/economic-calendar" },
  { title: "PnL Calendar", icon: DollarSign, href: "/pnl-calendar" },
];

export function AppSidebar({ onCollapsedChange }: { onCollapsedChange: (collapsed: boolean) => void }) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  const handleToggle = () => {
    const newCollapsedState = !isCollapsed;
    setIsCollapsed(newCollapsedState);
    onCollapsedChange(newCollapsedState);
  };

  return (
    <Sidebar
      className="h-[calc(100vh-4rem)] border-r relative z-10 transition-all duration-300 ease-in-out p-0"
      collapsible="icon"
      style={{ width: isCollapsed ? "3rem" : "12rem" }}
    >
      <SidebarHeader>
        <SidebarTrigger
          className="w-5 h-5 transition-transform duration-300 ease-in-out"
          onClick={handleToggle}
        />
      </SidebarHeader>
      <SidebarContent className="p-0">
        <SidebarGroup>
          <SidebarGroupContent className="p-0">
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="w-full justify-start">
                    <Link href={item.href} className="flex items-center w-full px-3 py-2">
                      <item.icon className="h-3 w-3 flex-shrink-0" />
                      <span
                        className={`transition-opacity duration-300 ease-in-out ${isCollapsed ? "opacity-0" : "opacity-100"}`}
                      >
                        {item.title}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}