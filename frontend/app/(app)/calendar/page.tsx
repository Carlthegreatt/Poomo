import CalendarView from "@/components/calendar/CalendarView";
import PageTransition from "@/components/ui/PageTransition";

export default function CalendarPage() {
  return (
    <PageTransition>
      <div className="flex-1 flex flex-col overflow-hidden pb-20 sm:pb-0 sm:pl-16">
        <CalendarView />
      </div>
    </PageTransition>
  );
}
