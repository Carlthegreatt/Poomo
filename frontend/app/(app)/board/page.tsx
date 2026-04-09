import Board from "@/components/kanban/Board";
import PageTransition from "@/components/ui/PageTransition";

export default function BoardPage() {
  return (
    <PageTransition>
      <div className="flex-1 flex flex-col overflow-hidden pb-20 sm:pb-0 sm:pl-16">
        <Board />
      </div>
    </PageTransition>
  );
}
