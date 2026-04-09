"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Calendar,
  dateFnsLocalizer,
  type SlotInfo,
  type View,
  type NavigateAction,
} from "react-big-calendar";
import {
  format,
  parse,
  startOfWeek,
  getDay,
  addMonths,
  addWeeks,
  addDays,
} from "date-fns";
import { enUS } from "date-fns/locale/en-US";

import "@/styles/calendar.css";

import CalendarToolbar from "./CalendarToolbar";
import EventCard, { eventStyleGetter } from "./EventCard";
import EventModal from "./EventModal";
import { useCalendar, type CalendarEntry } from "./useCalendar";
import { fetchBoard } from "@/lib/kanban";
import { EVENT_COLORS } from "@/lib/calendar";

const locales = { "en-US": enUS };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function CalendarView() {
  const { loadEvents, setKanbanTasks, getEntries, events, kanbanTasks } =
    useCalendar();

  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(new Date());
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEntry | null>(
    null,
  );
  const [slotStart, setSlotStart] = useState<Date | undefined>();
  const [slotEnd, setSlotEnd] = useState<Date | undefined>();
  const [defaultColor, setDefaultColor] = useState<string | null>(null);

  const colorIndexRef = useRef(0);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadEvents();
    fetchBoard().then(({ tasks }) => setKanbanTasks(tasks));
  }, [loadEvents, setKanbanTasks]);

  const entries = useMemo(
    () => getEntries(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [events, kanbanTasks],
  );

  const handleNavigate = useCallback(
    (action: "PREV" | "NEXT" | "TODAY") => {
      setDate((prev) => {
        if (action === "TODAY") return new Date();
        const delta = action === "NEXT" ? 1 : -1;
        if (view === "month") return addMonths(prev, delta);
        if (view === "week") return addWeeks(prev, delta);
        return addDays(prev, delta);
      });
    },
    [view],
  );

  const handleRbcNavigate = useCallback(
    (newDate: Date, _view: View, action: NavigateAction) => {
      if (action === "DATE") {
        setDate(newDate);
        setView("day");
      } else {
        setDate(newDate);
      }
    },
    [],
  );

  const handleSelecting = useCallback(() => {
    const nextColor = EVENT_COLORS[colorIndexRef.current % EVENT_COLORS.length];
    calendarRef.current?.style.setProperty("--selection-color", nextColor);
    return true;
  }, []);

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    const pickedColor =
      EVENT_COLORS[colorIndexRef.current % EVENT_COLORS.length];
    colorIndexRef.current += 1;

    setSelectedEvent(null);
    setSlotStart(slotInfo.start);
    setSlotEnd(slotInfo.end);
    setDefaultColor(pickedColor);
    setModalOpen(true);
  }, []);

  const handleSelectEvent = useCallback((entry: CalendarEntry) => {
    setSelectedEvent(entry);
    setSlotStart(undefined);
    setSlotEnd(undefined);
    setDefaultColor(null);
    setModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalOpen(false);
    setSelectedEvent(null);
    setSlotStart(undefined);
    setSlotEnd(undefined);
    setDefaultColor(null);
  }, []);

  return (
    <div className="flex-1 flex flex-col gap-4 p-4 sm:p-6 min-h-0 overflow-hidden">
      <CalendarToolbar
        date={date}
        view={view}
        onNavigate={handleNavigate}
        onView={setView}
      />

      <div className="flex-1 min-h-0 relative" ref={calendarRef}>
        <Calendar<CalendarEntry>
          localizer={localizer}
          events={entries}
          startAccessor="start"
          endAccessor="end"
          allDayAccessor="allDay"
          titleAccessor="title"
          view={view}
          date={date}
          onView={setView}
          onNavigate={handleRbcNavigate}
          selectable
          onSelecting={handleSelecting}
          onSelectSlot={handleSelectSlot}
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          components={{
            event: EventCard,
          }}
          toolbar={false}
          style={{ height: "100%" }}
          popup
        />
      </div>

      <EventModal
        open={modalOpen}
        onClose={handleCloseModal}
        event={selectedEvent}
        defaultStart={slotStart}
        defaultEnd={slotEnd}
        defaultColor={defaultColor}
      />
    </div>
  );
}
