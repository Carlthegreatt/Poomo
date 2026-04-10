import NotesView from "@/components/notes/NotesView";
import PageTransition from "@/components/ui/PageTransition";

export default function NotesPage() {
  return (
    <PageTransition>
      <div className="flex-1 flex flex-col overflow-hidden pb-20 sm:pb-0 sm:pl-16">
        <NotesView />
      </div>
    </PageTransition>
  );
}
