import ChatView from "@/components/chat/ChatView";
import PageTransition from "@/components/ui/PageTransition";

export default function Home() {
  return (
    <PageTransition>
      <div className="flex-1 flex flex-col overflow-hidden pb-20 sm:pb-0 sm:pl-16">
        <ChatView />
      </div>
    </PageTransition>
  );
}
