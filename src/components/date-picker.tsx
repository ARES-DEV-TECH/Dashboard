"use client"

import * as React from "react"
import { Calendar } from "@/components/ui/calendar"
import {
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar"

export function DatePicker() {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Prevent hydration mismatch by not rendering the calendar on server
  // or initial client render if it depends on local timezone/date
  if (!mounted) {
    return (
      <SidebarGroup className="px-0">
        <SidebarGroupContent>
          <div className="h-[280px] w-full" /> {/* Placeholder to minimize layout shift */}
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  return (
    <SidebarGroup className="px-0">
      <SidebarGroupContent>
        <Calendar className="[&_[role=gridcell]]:w-[33px]" />
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
