import FlashcardsView from "@/components/flashcards/FlashcardsView";
import PageTransition from "@/components/ui/PageTransition";

export default function FlashcardsPage() {
  return (
    <PageTransition>
      <div className="flex-1 flex flex-col overflow-hidden pb-20 sm:pb-0 sm:pl-16">
        <FlashcardsView />
      </div>
    </PageTransition>
  );
}
