"use client";

import { useEffect } from "react";
import { useStats } from "@/stores/statsStore";
import OverviewTab from "./OverviewTab";
import SessionsTab from "./SessionsTab";
import ChartsTab from "./ChartsTab";
import TasksTab from "./TasksTab";

export default function StatsView() {
  const { loadSessions, isLoading } = useStats();

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="size-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4 p-4 sm:p-6 min-h-0 overflow-y-auto">
      <h1 className="text-xl font-bold">Stats</h1>

      <OverviewTab />

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="shrink-0">
          <ChartsTab />
        </div>
        <div className="flex-1 min-w-0">
          <TasksTab />
        </div>
      </div>

      <SessionsTab />
    </div>
  );
}
