"use client"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"

interface YearPickerProps {
  currentYear: number
  onYearChange?: (year: number) => void
  className?: string
}

export function YearPicker({ currentYear, onYearChange, className }: YearPickerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleYearChange = useCallback((year: string) => {
    const newYear = parseInt(year)
    onYearChange?.(newYear)
    
    // Update URL params
    const params = new URLSearchParams(searchParams.toString())
    params.set('year', year)
    router.push(`?${params.toString()}`)
  }, [onYearChange, router, searchParams])

  // Generate years from 2020 to current year + 2
  const years = Array.from(
    { length: new Date().getFullYear() - 2020 + 3 },
    (_, i) => 2020 + i
  ).reverse()

  return (
    <Select value={currentYear.toString()} onValueChange={handleYearChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Sélectionner une année" />
      </SelectTrigger>
      <SelectContent>
        {years.map((year) => (
          <SelectItem key={year} value={year.toString()}>
            {year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
