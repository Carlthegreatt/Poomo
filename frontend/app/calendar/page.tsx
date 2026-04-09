"use client";

import Header from "@/components/header/header";
import Sidebar from "@/components/nav/Sidebar";
import CalendarView from "@/components/calendar/CalendarView";
import { Toaster } from "sonner";
import PageTransition from "@/components/ui/PageTransition";

export default function CalendarPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <Sidebar />
      <PageTransition>
        <div className="flex-1 flex flex-col overflow-hidden pb-20 sm:pb-0 sm:pl-16">
          <CalendarView />
        </div>
      </PageTransition>
      <Toaster position="top-center" />
    </div>
  );
}
