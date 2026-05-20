"use client";

import dayjs from "dayjs";
import calendar from "dayjs/plugin/calendar";

dayjs.extend(calendar);

interface DateSeparatorProps {
  timestamp: number;
}

export default function DateSeparator({ timestamp }: DateSeparatorProps) {
  const date = dayjs(timestamp);
  
  // Custom calendar format
  const label = date.calendar(null, {
    sameDay: "[Today]",
    lastDay: "[Yesterday]",
    lastWeek: "dddd",
    sameElse: "MMMM D, YYYY",
  });

  return (
    <div className="my-6 flex items-center justify-center">
      <span className="rounded-full bg-slate-100/80 px-3.5 py-1.5 text-[11px] font-bold tracking-wider text-slate-500 uppercase shadow-sm border border-slate-200/40 dark:bg-slate-800/80 dark:text-slate-400 dark:border-slate-700/40 select-none">
        {label}
      </span>
    </div>
  );
}
