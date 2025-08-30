import React from "react";
import { Home, Calendar, DollarSign } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Main", icon: Home, href: "/" },
  { title: "Economic Calendar", icon: Calendar, href: "/economic-calendar" },
  { title: "PnL Calendar", icon: DollarSign, href: "/pnl-calendar" },
];

export function AppSidebar({ onCollapsedChange }: { onCollapsedChange: (collapsed: boolean) => void }) {
  const { open } = useSidebar();
  const pathname = usePathname();

  return (
    <Sidebar
      className="border-r transition-all duration-300 ease-in-out"
      collapsible="icon"
      variant="sidebar"
      side="left"
    >
      <SidebarHeader className="p-0 h-20 flex items-center justify-center border-b">
        <SidebarTrigger className="w-4 h-4 transition-transform duration-300 ease-in-out" />
      </SidebarHeader>
      
      <SidebarContent className="pt-0">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      className="h-10 p-0 justify-start data-[active=true]:bg-accent data-[active=true]:text-accent-foreground"
                      data-active={isActive}
                    >
                      <Link 
                        href={item.href} 
                        className={`
                          flex items-center w-full relative rounded-md
                          hover:bg-accent hover:text-accent-foreground
                          focus:bg-accent focus:text-accent-foreground focus:outline-none
                          transition-colors duration-200
                          ${isActive ? 'bg-accent text-accent-foreground' : 'text-sidebar-foreground'}
                        `}
                      >
                        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                          <item.icon className={`
                            h-4 w-4 flex-shrink-0 transition-colors duration-200
                            ${isActive ? 'text-accent-foreground' : 'text-sidebar-foreground'}
                          `} />
                        </div>
                        <span className={`
                          ml-10 truncate text-sm transition-all duration-300
                          ${!open ? 'opacity-0 w-0' : 'opacity-100 w-auto'}
                          ${isActive ? 'text-accent-foreground font-medium' : 'text-sidebar-foreground'}
                        `}>
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      
      <SidebarRail />
    </Sidebar>
  );
}