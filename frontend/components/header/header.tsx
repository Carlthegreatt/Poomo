import { Button } from "../ui/button";
import { LogIn } from "lucide-react";
import { Settings } from "lucide-react";
import { ChartBar } from "lucide-react";
import { CircleUser } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky flex items-center justify-center top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container flex h-14 justify-between items-center  px-4">
        <div className="font-semibold text-xl">Poomo</div>
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon">
            <ChartBar className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <CircleUser className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
