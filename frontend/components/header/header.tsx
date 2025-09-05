import { Button } from "../ui/button";
import { LogIn } from "lucide-react";
import { Settings } from "lucide-react";
import { ChartBar } from "lucide-react";
import { CircleUser } from "lucide-react";

export default function Header() {
  return (
    <div>
      <div className="items-center flex w-full sm-hidden">
        <div className="font-semibold text-xl">Poomo</div>
        <div className="gap-6 flex justify-end ml-auto">
          <button>
            <ChartBar></ChartBar>
          </button>
          <button>
            <Settings></Settings>
          </button>
          <button>
            <CircleUser></CircleUser>
          </button>
        </div>
      </div>
    </div>
  );
}
