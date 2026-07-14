"use client";

import {
  IconArticleFilled,
  IconAssemblyFilled,
  IconCalendarFilled,
  IconChartBubbleFilled,
  IconChartDotsFilled,
  IconChessRookFilled,
  IconLayoutGridFilled,
  IconLayoutListFilled,
  IconVersionsFilled,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { type AppMode, ModeSelector } from "@/components/mode-selector";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const backtestRoutes = [
  { href: "/dashboard", label: "DASHBOARD", icon: IconLayoutGridFilled },
  { href: "/sessions", label: "SESSIONS", icon: IconVersionsFilled },
  { href: "/analytics", label: "ANALYTICS", icon: IconChartBubbleFilled },
  { href: "/trades", label: "TRADES", icon: IconLayoutListFilled },
  { href: "/strategies", label: "STRATEGIES", icon: IconChessRookFilled },
] as const;

const journalRoutes = [
  { href: "/journal/trades", label: "TRADES", icon: IconLayoutListFilled },
  { href: "/journal/statistics", label: "STATISTICS", icon: IconChartDotsFilled },
  { href: "/journal/notes", label: "NOTES", icon: IconArticleFilled },
  { href: "/journal/calendar", label: "CALENDAR", icon: IconCalendarFilled },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode: AppMode =
    pathname.startsWith("/journal") || searchParams.get("mode") === "journal"
      ? "journal"
      : "backtest";
  const routes = mode === "journal" ? journalRoutes : backtestRoutes;
  const settingsHref = mode === "journal" ? "/settings?mode=journal" : "/settings";

  function changeMode(nextMode: AppMode) {
    if (nextMode === mode) return;

    if (pathname === "/settings") {
      router.replace(nextMode === "journal" ? "/settings?mode=journal" : "/settings");
      return;
    }

    router.push(nextMode === "journal" ? "/journal/trades" : "/dashboard");
  }

  return (
    <aside className="sticky top-0 flex h-svh w-16 shrink-0 flex-col p-2.5 text-sidebar-foreground sm:w-50">
      <nav className="flex flex-1 flex-col gap-[1px]">
        <ModeSelector mode={mode} onModeChange={changeMode} />
        {routes.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            aria-label={label}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "w-full min-h-10 justify-start !p-3 !capitalize",
              pathname === href &&
                "bg-white text-background hover:bg-white hover:text-background",
            )}
          >
            <Icon data-icon="inline-start" />
            <span className="hidden pl-1.5 sm:inline">{label}</span>
          </Link>
        ))}
        <Link
          href={settingsHref}
          aria-current={pathname === "/settings" ? "page" : undefined}
          aria-label="SETTINGS"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "mt-auto w-full min-h-10 justify-start !p-3 !capitalize",
            pathname === "/settings" &&
              "bg-white text-background hover:bg-white hover:text-background",
          )}
        >
          <IconAssemblyFilled data-icon="inline-start" />
          <span className="hidden pl-1.5 sm:inline">SETTINGS</span>
        </Link>
      </nav>
    </aside>
  );
}
