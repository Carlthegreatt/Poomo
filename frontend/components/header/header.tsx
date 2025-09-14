import { Button } from "../ui/button";
import { Settings } from "lucide-react";
import { ChartBar } from "lucide-react";
import { CircleUser } from "lucide-react";
import { logout } from "../../app/login/actions";
import { LogOut } from "lucide-react";

export default function Header() {
  return (
    <header className="sticky flex items-center justify-center top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <div className="container flex h-18 justify-between items-center px-4">
        <div className="font-semibold text-xl lg:text-2xl">Poomo</div>
        <div className="flex items-center gap-4">
          <Button className="cursor-pointer" variant="ghost" size="icon">
            <ChartBar className="cursor-pointer h-4 w-4" />
          </Button>
          <Button className="cursor-pointer" variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
          <Button className="cursor-pointer" variant="ghost" size="icon">
            <CircleUser className="h-4 w-4" />
          </Button>
          <form action={logout}>
            <Button
              className="cursor-pointer"
              variant="ghost"
              size="icon"
              type="submit"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
