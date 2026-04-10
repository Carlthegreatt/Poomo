import Header from "@/components/header/Header";
import Sidebar from "@/components/nav/Sidebar";
import TimerCompletionBridge from "@/components/timer/TimerCompletionBridge";
import { Toaster } from "sonner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <Sidebar />
      <TimerCompletionBridge />
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {children}
      </main>
      <Toaster position="top-center" />
    </div>
  );
}
