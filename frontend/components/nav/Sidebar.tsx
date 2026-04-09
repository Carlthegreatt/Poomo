"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Timer, LayoutDashboard, CalendarDays, ChartBar, MessageCircle } from "lucide-react";

const NAV_ITEMS = [
  { href: "/chat", icon: MessageCircle, label: "Chat" },
  { href: "/", icon: Timer, label: "Pomodoro" },
  { href: "/board", icon: LayoutDashboard, label: "Board" },
  { href: "/calendar", icon: CalendarDays, label: "Calendar" },
  { href: "/stats", icon: ChartBar, label: "Stats" },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <nav className="fixed z-40 bottom-4 left-1/2 -translate-x-1/2 sm:bottom-auto sm:left-4 sm:top-1/2 sm:-translate-y-1/2 sm:translate-x-0 flex sm:flex-col gap-1 border-2 border-border bg-white rounded-full p-1.5 shadow-[3px_3px_0_black]">
      {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
        const isActive = pathname === href;
        return (
          <motion.button
            key={href}
            onClick={() => router.push(href)}
            title={label}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className={`relative size-10 sm:size-11 flex items-center justify-center rounded-full transition-colors cursor-pointer ${
              isActive
                ? "bg-primary text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="sidebar-active"
                className="absolute inset-0 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <Icon className="size-5 relative z-10" />
          </motion.button>
        );
      })}
    </nav>
  );
}
