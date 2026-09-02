import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { cn } from "../../lib/utils"
import { buttonVariants } from "./button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

/**
 * Thin wrapper over react-day-picker v9. The classNames keys below are the v9
 * element names (month_caption, button_previous, day_button, selected, today…).
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        months: "relative flex flex-col gap-4 sm:flex-row",
        month: "flex flex-col gap-4",
        month_caption: "flex h-7 items-center justify-center",
        caption_label: "text-sm font-medium",
        nav: "absolute inset-x-0 top-0 flex h-7 items-center justify-between",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-60 hover:opacity-100"
        ),
        chevron: "h-4 w-4",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 rounded-md text-[0.8rem] font-normal text-muted-foreground",
        week: "mt-2 flex w-full",
        day: "relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal"
        ),
        // Selected day: solid primary pill, kept on hover/focus.
        selected:
          "rounded-control bg-primary text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground [&>button]:focus-visible:bg-primary",
        // Today: outlined + bold so it stands out even when another day is selected.
        today: "rounded-control font-semibold [&>button]:font-semibold [&>button]:ring-2 [&>button]:ring-inset [&>button]:ring-primary/70",
        outside: "text-muted-foreground opacity-40",
        disabled: "text-muted-foreground opacity-40",
        range_start: "rounded-l-md bg-primary text-primary-foreground",
        range_end: "rounded-r-md bg-primary text-primary-foreground",
        range_middle: "bg-accent text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClassName }) =>
          orientation === "left" ? (
            <ChevronLeft className={cn("h-4 w-4", chevronClassName)} />
          ) : (
            <ChevronRight className={cn("h-4 w-4", chevronClassName)} />
          ),
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
