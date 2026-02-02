'use client'

import * as React from 'react'
import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { DateRange as DayPickerRange } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { 
  calculatePresetDates, 
  formatDateRange, 
  PRESET_OPTIONS, 
  type DateRange,
  type PresetFilter 
} from '@/lib/date-utils'

interface DateRangePickerProps {
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
  align?: 'start' | 'center' | 'end'
}

export function DateRangePicker({
  dateRange,
  onDateRangeChange,
  align = 'end',
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  
  // Convert custom DateRange to DayPickerRange for the Calendar component
  const selectedRange: DayPickerRange | undefined = React.useMemo(() => {
    return {
      from: dateRange.start,
      to: dateRange.end,
    }
  }, [dateRange])

  const handlePresetSelect = (preset: PresetFilter) => {
    if (preset === 'custom') {
      // Pour "custom", on ne fait rien de spécial ici, l'utilisateur doit choisir sur le calendrier
      // Ou on pourrait ouvrir le calendrier en focus.
      return
    }
    const newRange = calculatePresetDates(preset)
    onDateRangeChange(newRange)
    setOpen(false)
  }

  const handleCalendarSelect = (range: DayPickerRange | undefined) => {
    if (range?.from) {
      onDateRangeChange({
        start: range.from,
        end: range.to || range.from, // Si pas de date de fin, on prend la date de début
        preset: 'custom'
      })
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id="date"
          variant={'outline'}
          className={cn(
            'w-[260px] justify-start text-left font-normal',
            !dateRange && 'text-muted-foreground'
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateRange ? (
            formatDateRange(dateRange)
          ) : (
            <span>Choisir une période</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-background border rounded-lg shadow-xl" align={align}>
        <div className="flex">
          {/* Colonne des pré-sélections */}
          <div className="flex flex-col gap-1 p-2 border-r min-w-[160px] bg-muted/10">
            <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mb-1">
              Raccourcis
            </p>
            {PRESET_OPTIONS.filter(p => p.value !== 'custom').map((preset) => (
              <Button
                key={preset.value}
                variant="ghost"
                size="sm"
                className={cn(
                  "justify-start font-normal h-8 px-2",
                  dateRange.preset === preset.value && "bg-accent text-accent-foreground font-medium"
                )}
                onClick={() => handlePresetSelect(preset.value)}
              >
                <span className="mr-2">{preset.icon}</span>
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Calendrier */}
          <div className="p-2">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange.start}
              selected={selectedRange}
              onSelect={handleCalendarSelect}
              numberOfMonths={2}
              locale={fr}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
