"use client";

import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import { faDigits, num } from "@/lib/format";
import type { DayAvailability, SlotItem } from "@/lib/types";
import Spinner from "@/components/ui/Spinner";

/** Day strip + time grid. `base` is e.g. `/doctors/AbC123` or `/centers/lab-x`; `extra` adds `office=...`. */
export default function SlotPicker({
  base,
  extra = "",
  day,
  onDay,
  slot,
  onSlot,
  availabilityPath = "availability",
  slotsPath = "slots",
}: {
  availabilityPath?: string;
  slotsPath?: string;
  base: string;
  extra?: string;
  day: string | null;
  onDay: (d: string) => void;
  slot: number | null;
  onSlot: (s: SlotItem) => void;
}) {
  const availability = useQuery({
    queryKey: ["availability", base, availabilityPath, extra],
    queryFn: () => get<{ days: DayAvailability[] }>(`${base}/${availabilityPath}/?${extra}`),
  });
  const firstFree = availability.data?.days.find((d) => d.free > 0)?.date ?? null;
  const activeDay = day ?? firstFree;
  const slots = useQuery({
    queryKey: ["slots", base, slotsPath, extra, activeDay],
    queryFn: () => get<{ slots: SlotItem[] }>(`${base}/${slotsPath}/?${extra}&date=${activeDay}`),
    enabled: !!activeDay,
  });

  if (availability.isLoading) return <div className="grid h-32 place-items-center text-brand-600"><Spinner /></div>;
  if (!availability.data || !firstFree) return <p className="rounded-xl bg-slate-50 p-4 text-center text-sm text-muted">در حال حاضر نوبت آزادی وجود ندارد.</p>;

  return (
    <div className="space-y-4">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {availability.data.days.map((d) => (
          <button
            key={d.date}
            disabled={!d.free}
            onClick={() => onDay(d.date)}
            className={`flex w-16 shrink-0 flex-col items-center rounded-xl border py-2 text-xs transition disabled:opacity-40 ${
              activeDay === d.date ? "border-brand-600 bg-brand-600 text-white" : "border-line bg-white hover:border-brand-400"
            }`}
          >
            <span>{d.weekday}</span>
            <b className="text-base">{num(d.day)}</b>
            <span>{d.month}</span>
          </button>
        ))}
      </div>
      {slots.isLoading ? (
        <div className="grid h-20 place-items-center text-brand-600"><Spinner /></div>
      ) : slots.data?.slots.length ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {slots.data.slots.map((s) => (
            <button
              key={s.id}
              data-slot={s.id}
              onClick={() => onSlot(s)}
              className={`rounded-lg border py-2 text-sm font-semibold transition ${
                slot === s.id ? "border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-200" : "border-line bg-white hover:border-brand-400"
              }`}
            >
              {faDigits(s.time)}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted">برای این روز نوبت آزاد نیست.</p>
      )}
    </div>
  );
}
