import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "../ui/button";
import Upload from "./upload";

export default function Player() {
  return (
    <div className="flex gap-2 mt-5 items-center justify-center">
      <Select>
        <SelectTrigger className="w-[240px]">
          <SelectValue placeholder="Select background music" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Your music</SelectLabel>
            <SelectItem value="White Noise">White Noise</SelectItem>
            <SelectItem value="Brown Noise">Brown Noise</SelectItem>
            <SelectItem value="Lo Fi">Lo Fi</SelectItem>
            <SelectItem value="grapes">Mozart</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      <Button>
        <Upload></Upload>
      </Button>
    </div>
  );
}
