import { UploadCalendar } from "@/components/dashboard/upload-calendar"
import { createClient } from "@/lib/supabase/server"

export default async function DashboardPage() {
  const year = new Date().getUTCFullYear()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("backtest_upload_calendar")
    .select("upload_date, upload_count")
    .gte("upload_date", `${year}-01-01`)
    .lt("upload_date", `${year + 1}-01-01`)
    .order("upload_date")

  const uploads = (data ?? []).flatMap(({ upload_count, upload_date }) =>
    upload_date && upload_count !== null
      ? [{ count: Number(upload_count), date: upload_date }]
      : [],
  )

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-5 px-2 pt-2">
      <header className="shrink-0 border-b pb-2">
        <h1 className="text-xl font-semibold">DASHBOARD</h1>
      </header>
      <div className="min-w-0 pt-2">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-medium">UPLOAD ACTIVITY</h2>
          <span className="text-xs text-muted-foreground">{year}</span>
        </div>
        {error ? (
          <p className="py-8 text-sm text-muted-foreground">Could not load upload activity.</p>
        ) : (
          <UploadCalendar data={uploads} year={year} />
        )}
      </div>
    </section>
  )
}
