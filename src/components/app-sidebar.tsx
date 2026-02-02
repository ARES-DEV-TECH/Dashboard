"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  BarChart3,
  Users,
  Settings,
  Plus,
  CalendarDays,
  Package,
  ShoppingCart,
  Receipt,
} from "lucide-react"

import { Calendars } from "@/components/calendars"
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
} from "@/components/ui/sidebar"

import { useAuth } from "@/components/auth-provider"

/** Nom de l’app affiché dans la sidebar (masqué en mode replié) */
const APP_TITLE = "CAMPING LES PINS"

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
  calendars: [
    { name: "Mes calendriers", items: ["Personnel", "Travail", "Famille"] },
    { name: "Favoris", items: ["Jours fériés", "Anniversaires"] },
    { name: "Autres", items: ["Voyages", "Rappels", "Échéances"] },
  ],
}

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  const { user } = useAuth()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const userData = user
    ? {
        name: [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email?.split("@")[0] || "Utilisateur",
        email: user.email || "",
        avatar: undefined,
      }
    : data.user

  return (
    <Sidebar {...props} collapsible="icon">
      <SidebarHeader className="border-sidebar-border flex h-14 items-center gap-2 border-b px-3">
        <div className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg group-data-[collapsible=icon]:size-8">
          <CalendarDays className="size-4" />
        </div>
        <span className="font-semibold tracking-tight truncate min-w-0 transition-[opacity,width,margin] duration-200 ease-linear group-data-[collapsible=icon]:w-0 group-data-[collapsible=icon]:min-w-0 group-data-[collapsible=icon]:overflow-hidden group-data-[collapsible=icon]:opacity-0 group-data-[collapsible=icon]:-ml-2">
          {APP_TITLE}
        </span>
        <SidebarTrigger className="ml-auto shrink-0 -mr-1" />
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
                    <Link href={item.url}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Calendrier</SidebarGroupLabel>
          <SidebarGroupContent>
            {mounted ? (
              <>
                <DatePicker />
                <Calendars calendars={data.calendars} />
              </>
            ) : (
              <div className="h-20 rounded-md bg-sidebar-accent/30 animate-pulse" aria-hidden />
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-sidebar-border border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Nouveau calendrier">
              <Link href="#">
                <Plus className="size-4" />
                <span>Nouveau calendrier</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Paramètres" isActive={pathname === "/settings"}>
              <Link href="/settings">
                <Settings className="size-4" />
                <span>Paramètres</span>
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
