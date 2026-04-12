"use client";

import { useRef, useCallback, useEffect, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Palette,
  Highlighter,
  Undo,
  Redo,
  Type,
  RemoveFormatting,
} from "lucide-react";
import { NOTE_COLORS } from "@/lib/notes";
import type { Note } from "@/lib/notes";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

const TEXT_COLORS = [
  "#1a1a1a",
  "#FD5A46",
  "#058CD7",
  "#552CB7",
  "#00995E",
  "#FFC567",
  "#FB7DA8",
];

const HIGHLIGHT_COLORS = [
  "transparent",
  "#FEE2DF",
  "#DCEEFB",
  "#E8E0F5",
  "#D1FAE5",
  "#FEF3C7",
  "#FCE7F3",
];

interface ToolbarButtonProps {
  icon: React.ReactNode;
  title: string;
  active?: boolean;
  onClick: () => void;
  className?: string;
}

function ToolbarButton({
  icon,
  title,
  active,
  onClick,
  className,
}: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault(); // keep focus in contentEditable
        onClick();
      }}
      title={title}
      className={cn(
        "size-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-muted",
        className,
      )}
    >
      {icon}
    </button>
  );
}

function ToolbarSeparator() {
  return <div className="w-px h-5 bg-border/40 mx-0.5 shrink-0" />;
}



interface ColorDropdownProps {
  colors: string[];
  icon: React.ReactNode;
  title: string;
  onSelect: (color: string) => void;
}

function ColorDropdown({ colors, icon, title, onSelect }: ColorDropdownProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={title}
          className="size-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          {icon}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="z-[100] w-auto p-1.5 border-2 border-border rounded-xl bg-white shadow-[3px_3px_0_black]"
      >
        <div className="flex gap-1">
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(c);
              }}
              className="size-6 rounded-full border-2 border-border/30 hover:border-border transition-colors cursor-pointer"
              style={{
                backgroundColor: c === "transparent" ? "var(--muted)" : c,
              }}
              title={c === "transparent" ? "None" : c}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface NoteEditorProps {
  note: Note;
  onSaveTitle: (title: string) => void;
  onSaveContent: (content: string) => void;
  onChangeColor: (color: string | null) => void;
}

export default function NoteEditor({
  note,
  onSaveTitle,
  onSaveContent,
  onChangeColor,
}: NoteEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(note.title);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  // Initialize editor content once
  useEffect(() => {
    if (editorRef.current && !initializedRef.current) {
      editorRef.current.innerHTML = note.content;
      initializedRef.current = true;
    }
  }, [note.content]);

  // Reset on note change
  useEffect(() => {
    setTitle(note.title);
    initializedRef.current = false;
    if (editorRef.current) {
      editorRef.current.innerHTML = note.content;
      initializedRef.current = true;
    }
  }, [note.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const exec = useCallback((command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  }, []);

  const debouncedSaveContent = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      if (editorRef.current) {
        onSaveContent(editorRef.current.innerHTML);
      }
    }, 500);
  }, [onSaveContent]);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const handleTitleBlur = useCallback(() => {
    const trimmed = title.trim() || "Untitled";
    setTitle(trimmed);
    onSaveTitle(trimmed);
  }, [title, onSaveTitle]);

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleTitleBlur();
        editorRef.current?.focus();
      }
    },
    [handleTitleBlur],
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-0.5 px-3 sm:px-4 py-2 border-b-2 border-border bg-white overflow-x-auto">
        <ToolbarButton
          icon={<Bold className="size-3.5" />}
          title="Bold (Ctrl+B)"
          onClick={() => exec("bold")}
        />
        <ToolbarButton
          icon={<Italic className="size-3.5" />}
          title="Italic (Ctrl+I)"
          onClick={() => exec("italic")}
        />
        <ToolbarButton
          icon={<Underline className="size-3.5" />}
          title="Underline (Ctrl+U)"
          onClick={() => exec("underline")}
        />
        <ToolbarButton
          icon={<Strikethrough className="size-3.5" />}
          title="Strikethrough"
          onClick={() => exec("strikeThrough")}
        />

        <ToolbarSeparator />

        <ToolbarButton
          icon={<Heading1 className="size-3.5" />}
          title="Heading 1"
          onClick={() => exec("formatBlock", "h1")}
        />
        <ToolbarButton
          icon={<Heading2 className="size-3.5" />}
          title="Heading 2"
          onClick={() => exec("formatBlock", "h2")}
        />
        <ToolbarButton
          icon={<Type className="size-3.5" />}
          title="Normal text"
          onClick={() => exec("formatBlock", "p")}
        />

        <ToolbarSeparator />

        <ToolbarButton
          icon={<List className="size-3.5" />}
          title="Bullet list"
          onClick={() => exec("insertUnorderedList")}
        />
        <ToolbarButton
          icon={<ListOrdered className="size-3.5" />}
          title="Numbered list"
          onClick={() => exec("insertOrderedList")}
        />

        <ToolbarSeparator />

        <ToolbarButton
          icon={<AlignLeft className="size-3.5" />}
          title="Align left"
          onClick={() => exec("justifyLeft")}
        />
        <ToolbarButton
          icon={<AlignCenter className="size-3.5" />}
          title="Align center"
          onClick={() => exec("justifyCenter")}
        />
        <ToolbarButton
          icon={<AlignRight className="size-3.5" />}
          title="Align right"
          onClick={() => exec("justifyRight")}
        />

        <ToolbarSeparator />

        <ColorDropdown
          icon={<Palette className="size-3.5" />}
          title="Text color"
          colors={TEXT_COLORS}
          onSelect={(c) => exec("foreColor", c)}
        />
        <ColorDropdown
          icon={<Highlighter className="size-3.5" />}
          title="Highlight"
          colors={HIGHLIGHT_COLORS}
          onSelect={(c) => exec("hiliteColor", c)}
        />

        <ToolbarSeparator />

        <ToolbarButton
          icon={<RemoveFormatting className="size-3.5" />}
          title="Clear formatting"
          onClick={() => exec("removeFormat")}
        />
        <ToolbarButton
          icon={<Undo className="size-3.5" />}
          title="Undo (Ctrl+Z)"
          onClick={() => exec("undo")}
        />
        <ToolbarButton
          icon={<Redo className="size-3.5" />}
          title="Redo (Ctrl+Y)"
          onClick={() => exec("redo")}
        />
      </div>

      {/* Editor body */}
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-8 py-4 sm:py-6">
          {/* Note Color */}
          <div className="flex items-center gap-1.5 mb-4">
            {NOTE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() =>
                  onChangeColor(note.color === c ? null : c)
                }
                className={cn(
                  "size-5 rounded-full border-2 transition-all cursor-pointer",
                  note.color === c
                    ? "border-border scale-110 shadow-[1px_1px_0_black]"
                    : "border-transparent hover:border-border/40",
                )}
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>

          {/* Title */}
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleBlur}
            onKeyDown={handleTitleKeyDown}
            placeholder="Untitled"
            className="w-full text-2xl sm:text-3xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/40 mb-4"
          />

          {/* Content editable */}
          <div
            ref={editorRef}
            contentEditable
            suppressContentEditableWarning
            onInput={debouncedSaveContent}
            className="note-editor min-h-[300px] text-sm sm:text-base leading-relaxed outline-none focus:outline-none"
            data-placeholder="Start writing..."
          />
        </div>
      </div>
    </div>
  );
}
