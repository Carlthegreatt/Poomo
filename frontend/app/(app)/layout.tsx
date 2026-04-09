import Header from "@/components/header/Header";
import Sidebar from "@/components/nav/Sidebar";
import { Toaster } from "sonner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <Sidebar />
      {children}
      <Toaster position="top-center" />
    </div>
  );
}
