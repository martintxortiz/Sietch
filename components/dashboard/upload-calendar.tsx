"use client"

import { HeatmapChart } from "echarts/charts"
import {
  AriaComponent,
  CalendarComponent,
  TooltipComponent,
  VisualMapComponent,
} from "echarts/components"
import { init, use as registerEChartsComponents, type ECharts } from "echarts/core"
import { CanvasRenderer } from "echarts/renderers"
import { useEffect, useRef } from "react"

registerEChartsComponents([
  AriaComponent,
  CalendarComponent,
  HeatmapChart,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer,
])

export interface UploadCalendarPoint {
  count: number
  date: string
}

export function UploadCalendar({
  data,
  year,
}: {
  data: UploadCalendarPoint[]
  year: number
}) {
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!rootRef.current) return

    const chart: ECharts = init(rootRef.current, "dark", { renderer: "canvas" })
    const max = Math.max(1, ...data.map(({ count }) => count))
    chart.setOption({
      aria: {
        enabled: true,
        description: `Session uploads by day for ${year}.`,
      },
      backgroundColor: "transparent",
      calendar: {
        bottom: 24,
        cellSize: ["auto", 18],
        dayLabel: {
          color: "#737373",
          firstDay: 1,
          fontSize: 10,
          margin: 8,
          nameMap: ["S", "M", "T", "W", "T", "F", "S"],
        },
        itemStyle: {
          borderColor: "#000000",
          borderWidth: 3,
          color: "#111111",
        },
        left: 28,
        monthLabel: {
          color: "#a3a3a3",
          fontSize: 11,
          margin: 10,
        },
        orient: "horizontal",
        range: String(year),
        right: 8,
        splitLine: { show: false },
        top: 30,
        yearLabel: { show: false },
      },
      series: [{
        coordinateSystem: "calendar",
        data: data.map(({ count, date }) => [date, count]),
        name: "Uploads",
        type: "heatmap",
      }],
      tooltip: { trigger: "item" },
      visualMap: {
        inRange: { color: ["#142c36", "#2596be"] },
        max,
        min: 0,
        show: false,
      },
    })

    const resizeObserver = new ResizeObserver(() => chart.resize())
    resizeObserver.observe(rootRef.current)
    return () => {
      resizeObserver.disconnect()
      chart.dispose()
    }
  }, [data, year])

  return (
    <div
      aria-label={`Session upload calendar for ${year}`}
      className="h-52 w-full min-w-0"
      ref={rootRef}
      role="img"
    />
  )
}
