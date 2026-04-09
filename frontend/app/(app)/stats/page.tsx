import StatsView from "@/components/stats/StatsView";
import PageTransition from "@/components/ui/PageTransition";

export default function StatsPage() {
  return (
    <PageTransition>
      <div className="flex-1 flex flex-col overflow-hidden pb-20 sm:pb-0 sm:pl-16">
        <StatsView />
      </div>
    </PageTransition>
  );
}
