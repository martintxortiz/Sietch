"use client";

import {
  IconAssemblyFilled,
  IconBriefcaseFilled,
  IconCalendarMonthFilled,
  IconChartBubbleFilled,
  IconChessRookFilled,
  IconEditFilled, IconHome2Filled,
  IconLayoutListFilled,
  IconPencilFilled,
  IconVersionsFilled,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useOptimistic } from "react";

import { type AppMode, ModeSelector } from "@/components/mode-selector";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const backtestRoutes = [
  { href: "/dashboard", label: "dashboard", icon: IconHome2Filled },
  { href: "/sessions", label: "SESSIONS", icon: IconVersionsFilled },
  { href: "/analytics", label: "ANALYTICS", icon: IconChartBubbleFilled },
  { href: "/trades", label: "TRADES", icon: IconLayoutListFilled },
  { href: "/strategies", label: "STRATEGIES", icon: IconChessRookFilled },
] as const;

const journalRoutes = [
  { href: "/journal/accounts", label: "ACCOUNTS", icon: IconBriefcaseFilled },
  { href: "/journal/trades", label: "TRADES", icon: IconLayoutListFilled },
  { href: "/journal/analytics", label: "ANALYTICS", icon: IconChartBubbleFilled },
  { href: "/journal/notes", label: "NOTES", icon: IconPencilFilled },
  { href: "/journal/calendar", label: "CALENDAR", icon: IconCalendarMonthFilled },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const routeMode: AppMode =
    pathname === "/wallet"
      ? "wallet"
      : pathname === "/signal"
      ? "signal"
      : pathname.startsWith("/journal")
      ? "journal"
      : modeParam === "signal" ||
          modeParam === "journal" ||
          modeParam === "wallet"
        ? modeParam
        : "backtest";
  const [mode, setMode] = useOptimistic(routeMode);
  const routes =
    mode === "backtest" ? backtestRoutes : mode === "journal" ? journalRoutes : [];
  const settingsHref = mode === "backtest" ? "/settings" : `/settings?mode=${mode}`;

  function changeMode(nextMode: AppMode) {
    if (nextMode === mode) return;
    setMode(nextMode);

    if (pathname === "/settings") {
      router.replace(
        nextMode === "backtest" ? "/settings" : `/settings?mode=${nextMode}`,
      );
      return;
    }

    router.push(
      nextMode === "journal"
        ? "/journal/accounts"
        : nextMode === "signal"
          ? "/signal"
          : nextMode === "wallet"
            ? "/wallet"
            : "/dashboard",
    );
  }

  return (
    <aside className="sticky top-0 flex h-svh w-16 shrink-0 flex-col p-2.5 text-foreground sm:w-50">
      <nav className="flex flex-1 flex-col gap-[1px]">
        <ModeSelector mode={mode} onModeChange={changeMode} />
        {routes.length > 0 && (
          <div
            key={mode}
            className="sidebar-mode-content flex flex-col gap-[1px]"
          >
            {routes.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);

              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  aria-label={label}
                  className={cn(
                    buttonVariants({ variant: "ghost" }),
                    "size-11 justify-center !p-3 !capitalize sm:h-10 sm:w-full sm:justify-start",
                    active &&
                      "bg-white text-background hover:bg-white hover:text-background",
                  )}
                >
                  <Icon data-icon="inline-start" />
                  <span className="hidden pl-1.5 sm:inline">{label}</span>
                </Link>
              );
            })}
          </div>
        )}
        {mode === "signal" && (
          <div
            key={mode}
            className="sidebar-mode-content flex min-h-0 flex-1 flex-col gap-[1px]"
          >
            <Button
              variant="ghost"
              aria-label="New chat"
              className="size-11 justify-center !p-3 !capitalize sm:h-10 sm:w-full sm:justify-start"
            >
              <IconEditFilled data-icon="inline-start" />
              <span className="hidden pl-1.5 sm:inline">NEW CHAT</span>
            </Button>
            <div aria-label="Chat history" className="min-h-0 flex-1" />
          </div>
        )}
        <Link
          href={settingsHref}
          aria-current={pathname === "/settings" ? "page" : undefined}
          aria-label="SETTINGS"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "sidebar-shell-reveal mt-auto size-11 justify-center !p-3 !capitalize sm:h-10 sm:w-full sm:justify-start",
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
