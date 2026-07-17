import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading page"
      className="flex h-[calc(100svh-2rem)] min-w-0 flex-1 flex-col gap-5 px-2 pt-2 sm:h-[calc(100svh-3rem)]"
    >
      <header className="shrink-0 border-b pb-2">
        <Skeleton className="h-7 w-32" />
      </header>
      <div className="flex shrink-0 items-center gap-2">
        <Skeleton className="h-10 w-80 rounded-full" />
        <Skeleton className="size-10 rounded-full" />
      </div>
      <Skeleton className="min-h-0 flex-1 rounded-xl" />
    </section>
  )
}
