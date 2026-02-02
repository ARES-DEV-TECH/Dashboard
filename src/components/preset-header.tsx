'use client'

import { DateRangePicker } from '@/components/date-range-picker'
import type { DateRange } from '@/lib/date-utils'

interface PresetHeaderProps {
  title: string
  description?: string
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
  isLoading?: boolean
}

export function PresetHeader({ 
  title, 
  description, 
  dateRange, 
  onDateRangeChange,
  isLoading 
}: PresetHeaderProps) {
  
  return (
    <div className="px-4 pt-6 lg:px-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            {title}
            {isLoading && <span className="inline-block h-4 w-4 rounded-full border-2 border-primary border-r-transparent animate-spin" />}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker 
            dateRange={dateRange}
            onDateRangeChange={onDateRangeChange}
          />
        </div>
      </div>
    </div>
  )
}
