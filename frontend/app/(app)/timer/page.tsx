import Timer from "@/components/timer/Timer";
import PageTransition from "@/components/ui/PageTransition";

export default function TimerPage() {
  return (
    <PageTransition>
      <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 pb-20 sm:pb-8 sm:pl-20">
        <div className="w-full max-w-4xl flex flex-col items-center gap-6 sm:gap-8 lg:gap-10">
          <Timer />
        </div>
      </div>
    </PageTransition>
  );
}
