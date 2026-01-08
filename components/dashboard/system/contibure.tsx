"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  subDays,
  eachDayOfInterval,
  format,
  isSameDay,
  startOfWeek,
  endOfWeek,
  getDay,
} from "date-fns";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// --- Configuration ---
// เราจะกำหนดขนาด Block ตาม Range ที่เลือก
const GAP_SIZE = 4;

type Contribution = {
  date: Date;
  count: number;
};

type TimeRange = "7d" | "30d" | "90d" | "1y";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// --- Mock Data ---
const generateRandomData = (days: number): Contribution[] => {
  const today = new Date();
  const data: Contribution[] = [];
  for (let i = 0; i < days; i++) {
    const date = subDays(today, i);
    const count = Math.random() > 0.4 ? Math.floor(Math.random() * 10) : 0;
    data.push({ date, count });
  }
  // ถ้าเป็น 7d หรือ 30d เราต้องการเรียงจาก อดีต -> ปัจจุบัน (ซ้ายไปขวา บนลงล่าง)
  // แต่ถ้าเป็น 90d/1y (GitHub style) เราคำนวณอีกแบบ
  return data;
};

const getColorClass = (count: number) => {
  if (count === 0) return "bg-muted/30";
  if (count <= 2) return "bg-emerald-200 dark:bg-emerald-900";
  if (count <= 5) return "bg-emerald-400 dark:bg-emerald-700";
  if (count <= 8) return "bg-emerald-600 dark:bg-emerald-500";
  return "bg-emerald-800 dark:bg-emerald-300";
};

export default function ContributionHeatmap() {
  const [range, setRange] = useState<TimeRange>("1y");
  const [data, setData] = useState<Contribution[]>([]);

  // 1. กำหนดขนาดกล่องแบบ Dynamic
  const blockSize = useMemo(() => {
    if (range === "90d") return 32; // ใหญ่สะใจ
    if (range === "1y") return 14; // ขยายให้เต็มพื้นที่ (52 weeks * 18px approx 936px)
    return 12; // default
  }, [range]);

  useEffect(() => {
    let days = 365;
    if (range === "7d") days = 7;
    if (range === "30d") days = 30;
    if (range === "90d") days = 90;

    const generated = generateRandomData(days + 20);
    // สำหรับ 30 วัน และ 7 วัน ให้เรียงจาก อดีต -> ปัจจุบัน เพื่อ render แบบปฏิทิน
    if (range === "30d" || range === "7d") {
      setData(generated.sort((a, b) => a.date.getTime() - b.date.getTime()));
    } else {
      setData(generated);
    }
  }, [range]);

  // --- Logic for GitHub Grid Style (90d, 1y) ---
  const gridData = useMemo(() => {
    if (range === "7d" || range === "30d") return { weeks: [], months: [] };

    const today = new Date();
    const daysToSubtract = range === "90d" ? 90 : 365;
    const startDate = subDays(today, daysToSubtract);
    const startOfGrid = startOfWeek(startDate);
    const endOfGrid = today;

    const allDays = eachDayOfInterval({ start: startOfGrid, end: endOfGrid });
    const weeksData: { date: Date; count: number }[][] = [];
    let currentWeek: { date: Date; count: number }[] = [];

    // Map Data
    allDays.forEach((day) => {
      const found = data.find((d) => isSameDay(d.date, day));
      currentWeek.push({ date: day, count: found ? found.count : 0 });
      if (currentWeek.length === 7) {
        weeksData.push(currentWeek);
        currentWeek = [];
      }
    });
    if (currentWeek.length > 0) weeksData.push(currentWeek);

    // Month Labels
    const monthLabels: { label: string; index: number }[] = [];
    let lastMonthStr = "";
    let lastIndex = -10;

    weeksData.forEach((week, index) => {
      const firstDayOfWeek = week[0].date;
      const monthStr = format(firstDayOfWeek, "MMM");
      // Logic การเว้นระยะเดือน: ถ้าเป็น 90d กล่องใหญ่ ให้ถี่ขึ้นได้, ถ้า 1y ให้ห่างหน่อย
      const minGap = range === "90d" ? 1 : 2;

      if (monthStr !== lastMonthStr) {
        if (index - lastIndex > minGap) {
          monthLabels.push({ label: monthStr, index });
          lastMonthStr = monthStr;
          lastIndex = index;
        }
      }
    });

    return { weeks: weeksData, months: monthLabels };
  }, [range, data]);

  // --- RENDERERS ---

  // 1. View 7 วัน (Single Row ใหญ่ๆ)
  const render7Days = () => (
    <div className="flex w-full justify-around px-4 pt-2">
      {/* ตัดเอาแค่ 7 วันล่าสุด */}
      {data.slice(-7).map((item, index) => (
        <div key={index} className="flex flex-col items-center gap-2">
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "h-12 w-12 rounded-lg shadow-sm transition-all hover:scale-110",
                    getColorClass(item.count),
                  )}
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {item.count} contributions on {format(item.date, "MMM d")}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span className="text-muted-foreground text-xs font-medium">
            {format(item.date, "EEE")}
          </span>
        </div>
      ))}
    </div>
  );

  // 2. View 30 วัน (Calendar Grid - No Scroll)
  const render30Days = () => {
    // เอาแค่ 30 วันล่าสุด
    const displayData = data.slice(-30);

    // เติม Dummy ด้านหน้าเพื่อให้วันแรกตรงกับวันในสัปดาห์ (Alignment)
    const firstDate = displayData[0]?.date;
    const startOffset = firstDate ? getDay(firstDate) : 0; // 0 = Sun
    const blanks = Array.from({ length: startOffset });

    return (
      <div className="mx-auto w-full max-w-lg">
        {" "}
        {/* Limit width ให้สวยงาม */}
        {/* Header Days */}
        <div className="mb-2 grid grid-cols-7">
          {DAYS.map((d) => (
            <div
              key={d}
              className="text-muted-foreground text-center text-xs font-medium"
            >
              {d}
            </div>
          ))}
        </div>
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Blank spaces for offset */}
          {blanks.map((_, i) => (
            <div key={`blank-${i}`} />
          ))}

          {/* Actual Data */}
          {displayData.map((item, index) => (
            <TooltipProvider key={index}>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "aspect-square w-full rounded-md transition-all hover:ring-2 hover:ring-black/20",
                      getColorClass(item.count),
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <div className="text-center text-xs">
                    <p className="font-semibold">{item.count} contributions</p>
                    <p className="text-muted-foreground">
                      {format(item.date, "MMM d")}
                    </p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>
    );
  };

  // 3. View 90d & 1y (GitHub Grid Style)
  const renderGitHubGrid = () => {
    return (
      <div className="flex w-full justify-center">
        {" "}
        {/* Center Content */}
        {/* Left Labels */}
        <div
          className="mr-3 flex shrink-0 flex-col pt-[24px]"
          style={{ gap: `${GAP_SIZE}px` }}
        >
          {DAYS.map((day) => (
            <span
              key={day}
              className="text-muted-foreground flex w-[24px] items-center justify-end text-[10px]"
              style={{ height: `${blockSize}px` }}
            >
              {/* Show label only for Mon/Wed/Fri to reduce clutter if small, or all if big */}
              {blockSize > 15 || ["Mon", "Wed", "Fri"].includes(day) ? day : ""}
            </span>
          ))}
        </div>
        <div className="flex flex-col">
          {/* Month Labels */}
          <div className="text-muted-foreground relative mb-1 h-[20px] w-full text-xs">
            {gridData.months.map((m, i) => (
              <span
                key={i}
                className="absolute truncate font-medium"
                style={{ left: `${m.index * (blockSize + GAP_SIZE)}px` }}
              >
                {m.label}
              </span>
            ))}
          </div>

          {/* Heatmap Grid */}
          <div className="flex" style={{ gap: `${GAP_SIZE}px` }}>
            {gridData.weeks.map((week, weekIndex) => (
              <div
                key={weekIndex}
                className="flex flex-col"
                style={{ gap: `${GAP_SIZE}px` }}
              >
                {week.map((day, dayIndex) => {
                  const isFuture = day.date > new Date();
                  return (
                    <TooltipProvider key={dayIndex}>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <div
                            style={{ width: blockSize, height: blockSize }}
                            className={cn(
                              "rounded-[3px]",
                              isFuture
                                ? "opacity-0"
                                : cn(
                                    "cursor-pointer transition-all hover:opacity-80",
                                    getColorClass(day.count),
                                  ),
                            )}
                          />
                        </TooltipTrigger>
                        {!isFuture && (
                          <TooltipContent side="top">
                            <div className="text-center text-xs">
                              <p className="font-semibold">
                                {day.count} contributions
                              </p>
                              <p className="text-muted-foreground">
                                {format(day.date, "EEE, MMM d, yyyy")}
                              </p>
                            </div>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-card mx-auto w-full max-w-6xl border shadow-sm">
      <CardHeader className="mb-4 flex flex-col items-center justify-between gap-4 border-b pb-6 sm:flex-row">
        <div className="flex flex-col items-start">
          <CardTitle className="text-xl font-bold">
            Contribution Activity
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Visualizing your coding frequency
          </p>
        </div>

        <Tabs
          value={range}
          onValueChange={(val) => setRange(val as TimeRange)}
          className="w-full sm:w-auto"
        >
          <TabsList className="grid w-full grid-cols-4 sm:w-auto">
            <TabsTrigger value="7d">7 Days</TabsTrigger>
            <TabsTrigger value="30d">30 Days</TabsTrigger>
            <TabsTrigger value="90d">3 Months</TabsTrigger>
            <TabsTrigger value="1y">1 Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>

      <CardContent className="flex min-h-[200px] items-center justify-center px-2 pb-6 sm:px-6">
        {range === "7d" && render7Days()}
        {range === "30d" && render30Days()}
        {(range === "90d" || range === "1y") && (
          <div className="scrollbar-hide w-full overflow-x-auto">
            {renderGitHubGrid()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
