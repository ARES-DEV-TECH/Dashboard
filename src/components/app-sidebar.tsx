"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Settings,
  Bell,
  Package,
  ShoppingCart,
  Receipt,
} from "lucide-react"

import { Logo } from "@/components/logo"
import { DatePicker } from "@/components/date-picker"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

// Données statiques de la sidebar
const data = {
  user: {
    name: "Alex",
    email: "alex@example.com",
    avatar: undefined,
  },
  nav: [
    { title: "Tableau de bord", url: "/dashboard", icon: LayoutDashboard },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
    { title: "Clients", url: "/clients", icon: Users },
    { title: "Articles", url: "/articles", icon: Package },
    { title: "Ventes", url: "/sales", icon: ShoppingCart },
    { title: "Charges", url: "/charges", icon: Receipt },
  ],
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { user } = useAuth()
  const { isMobile, setOpenMobile } = useSidebar()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Fermer le menu (Sheet) sur mobile quand on change de page
  React.useEffect(() => {
    if (isMobile) setOpenMobile(false)
  }, [pathname, isMobile, setOpenMobile])

  const userData = user
    ? {
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email?.split("@")[0] || "Utilisateur",
        email: user.email || "",
        avatar: undefined,
      }
    : data.user

  return (
    <Sidebar {...props} collapsible="icon">
      <SidebarHeader className="border-sidebar-border relative z-30 flex flex-row h-14 items-center gap-2 border-b px-3 group-data-[collapsible=icon]:justify-between group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:gap-1">
        {isMobile && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 shrink-0 md:hidden"
            onClick={() => setOpenMobile(false)}
            aria-label="Fermer le menu"
            title="Fermer le menu"
          >
            <X className="size-5" />
          </Button>
        )}
        <div className="flex min-w-0 flex-1 items-center justify-center group-data-[collapsible=icon]:flex-initial group-data-[collapsible=icon]:min-w-0">
          <Logo size={100} className="rounded-lg shrink-0 ring-0 shadow-none outline-none select-none group-data-[collapsible=icon]:!hidden" />
          <Logo size={28} className="rounded shrink-0 ring-0 shadow-none outline-none select-none hidden group-data-[collapsible=icon]:!block" />
        </div>
        <SidebarTrigger className="ml-auto shrink-0 md:flex hidden transition-colors duration-150 relative z-10 min-w-[44px] min-h-[44px] touch-manipulation" />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {data.nav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                    className="group-data-[collapsible=icon]:data-[active=true]:border-l-0 group-data-[collapsible=icon]:data-[active=true]:ring-2 group-data-[collapsible=icon]:data-[active=true]:ring-sidebar-primary/80 group-data-[collapsible=icon]:data-[active=true]:rounded-md"
                  >
                    <Link href={item.url} className="flex items-center gap-2">
                      <item.icon className="size-4 shrink-0" />
                      <span className="truncate group-data-[collapsible=icon]:hidden">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator className="group-data-[collapsible=icon]:hidden" />
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel className="flex items-center gap-2">
            <Bell className="size-4 shrink-0" />
            Notifications
          </SidebarGroupLabel>
          <SidebarGroupContent>
            {mounted ? (
              <div className="rounded-md border border-sidebar-border bg-sidebar-accent/30 px-3 py-4 text-center text-sm text-sidebar-foreground/70">
                Aucune notification pour le moment.
              </div>
            ) : (
              <div className="h-16 rounded-md bg-sidebar-accent/30 animate-pulse" aria-hidden />
            )}
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel>Calendrier</SidebarGroupLabel>
          <SidebarGroupContent>
            {mounted ? <DatePicker /> : <div className="h-20 rounded-md bg-sidebar-accent/30 animate-pulse" aria-hidden />}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-sidebar-border border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Paramètres" isActive={pathname === "/settings"}>
              <Link href="/settings" className="flex items-center gap-2">
                <Settings className="size-4 shrink-0" />
                <span className="truncate group-data-[collapsible=icon]:hidden">Paramètres</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator className="mx-0" />
        {mounted ? (
          <NavUser user={userData} />
        ) : (
          <div className="flex h-12 items-center gap-2 px-2 text-sm text-sidebar-foreground/80">
            {userData.name}
          </div>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
