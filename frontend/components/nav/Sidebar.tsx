"use client";

import { usePathname, useRouter } from "next/navigation";
import { motion, LayoutGroup } from "framer-motion";
import { Timer, LayoutDashboard, CalendarDays, ChartBar, MessageCircle, StickyNote } from "lucide-react";
import { navDirection } from "@/lib/navDirection";

const NAV_ITEMS = [
  { href: "/", icon: MessageCircle, label: "Chat" },
  { href: "/timer", icon: Timer, label: "Pomodoro" },
  { href: "/board", icon: LayoutDashboard, label: "Board" },
  { href: "/calendar", icon: CalendarDays, label: "Calendar" },
  { href: "/notes", icon: StickyNote, label: "Notes" },
  { href: "/stats", icon: ChartBar, label: "Stats" },
] as const;

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const currentIndex = NAV_ITEMS.findIndex((item) => item.href === pathname);

  return (
    <LayoutGroup id="sidebar">
    <nav className="fixed z-40 bottom-4 left-1/2 -translate-x-1/2 sm:bottom-auto sm:left-4 sm:top-1/2 sm:-translate-y-1/2 sm:translate-x-0 flex sm:flex-col gap-1 border-2 border-border bg-white rounded-full p-1.5 shadow-[3px_3px_0_black]">
      {NAV_ITEMS.map(({ href, icon: Icon, label }, index) => {
        const isActive = pathname === href;
        return (
          <motion.button
            key={href}
            onClick={() => {
              if (href !== pathname) {
                navDirection.value = index > currentIndex ? 1 : -1;
                router.push(href);
              }
            }}
            title={label}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`relative size-10 sm:size-11 flex items-center justify-center rounded-full cursor-pointer ${
              isActive ? "text-white" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId="sidebar-pill"
                layout="position"
                className="absolute inset-0 rounded-full bg-primary shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)]"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            <motion.span
              animate={{ scale: isActive ? 1.05 : 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="relative z-10"
            >
              <Icon className="size-5" />
            </motion.span>
          </motion.button>
        );
      })}
    </nav>
    </LayoutGroup>
  );
}
