"use client";

import React, { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslations, useFormatter } from "next-intl";
import { useQuery } from "@tanstack/react-query";
import { fetchSystemActivityChartsApi } from "@/utils/api-request";
import {
  ActivityChartsResponse,
  HeatmapData,
  TimelineEvent,
  ActivityChartData,
} from "@/types/dashboard";
import {
  eachDayOfInterval,
  format,
  isSameDay,
  subDays,
  formatDistanceToNow,
  startOfWeek,
} from "date-fns";
import { cn } from "@/lib/utils";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";

interface ActivityHeatmapProps {
  className?: string;
  dateRange?: string;
}

export default function ActivityCharts({
  className,
  dateRange = "30",
}: ActivityHeatmapProps) {
  const t = useTranslations("Components.activityCharts");
  const formatTime = useFormatter();

  // Table states
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});

  const chartConfig: ChartConfig = {
    activity: { label: t("charts.activity"), color: "var(--chart-1)" },
    users: { label: t("charts.users"), color: "var(--chart-2)" },
    sessions: { label: t("charts.sessions"), color: "var(--chart-3)" },
  } as ChartConfig;

  const columns: ColumnDef<TimelineEvent>[] = [
    {
      accessorKey: "type",
      header: t("timeline.table.type"),
      cell: ({ row }) => {
        const event = row.original;
        return <span className="text-2xl">{getEventIcon(event.type)}</span>;
      },
    },
    {
      accessorKey: "activity",
      header: t("timeline.table.activity"),
      cell: ({ row }) => {
        const event = row.original;
        return (
          <div className="flex flex-col gap-1">
            <div className="font-medium">{event.title}</div>
            <Badge variant="secondary" className="w-fit text-xs">
              {t(`types.${event.type}`)}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "description",
      header: t("timeline.table.description"),
      cell: ({ row }) => {
        const event = row.original;
        return <span>{event.description || "-"}</span>;
      },
      meta: {
        className: "hidden md:table-cell",
      },
    },
    {
      accessorKey: "user",
      header: t("timeline.table.user"),
      cell: ({ row }) => {
        const event = row.original;
        return <span>{event.user || "-"}</span>;
      },
      meta: {
        className: "hidden lg:table-cell",
      },
    },
    {
      accessorKey: "timestamp",
      header: t("timeline.table.time"),
      cell: ({ row }) => {
        const event = row.original;
        return (
          <span>
            {formatTime.relativeTime(new Date(event.timestamp), {
              now: new Date(),
            })}
          </span>
        );
      },
    },
  ];

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["system-activity-charts", dateRange],
    queryFn: () => fetchSystemActivityChartsApi(dateRange),
  });

  const table = useReactTable({
    data: data?.timelineEvents || [],
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  const getHeatmapColor = (level: HeatmapData["level"]) => {
    switch (level) {
      case "very-high":
        return "bg-green-600";
      case "high":
        return "bg-green-500";
      case "medium":
        return "bg-green-300";
      case "low":
        return "bg-gray-200 dark:bg-gray-700";
      default:
        return "bg-gray-100 dark:bg-gray-800";
    }
  };

  const getEventIcon = (type: TimelineEvent["type"]) => {
    switch (type) {
      case "reading":
        return "📖";
      case "practice":
        return "✏️";
      case "assessment":
        return "📊";
      case "achievement":
        return "🏆";
      default:
        return "📌";
    }
  };

  const blockSize = useMemo(() => {
    if (dateRange === "90") return 32; // ใหญ่สะใจ
    if (dateRange === "all") return 14; // ขยายให้เต็มพื้นที่ (52 weeks * 18px approx 936px)
    return 12; // default
  }, [dateRange]);

  const gridData = useMemo(() => {
    if (dateRange === "7" || dateRange === "30")
      return { weeks: [], months: [] };

    const today = new Date();
    const daysToSubtract = dateRange === "90" ? 90 : 365;
    const startDate = subDays(today, daysToSubtract);
    const startOfGrid = startOfWeek(startDate);
    const endOfGrid = today;

    const allDays = eachDayOfInterval({ start: startOfGrid, end: endOfGrid });
    const weeksData: {
      date: Date;
      count: number;
      level: HeatmapData["level"];
    }[][] = [];
    let currentWeek: {
      date: Date;
      count: number;
      level: HeatmapData["level"];
    }[] = [];

    // Map Data
    allDays.forEach((day) => {
      const found = data?.heatmapData.find((d: HeatmapData) =>
        isSameDay(d.date, day),
      );
      currentWeek.push({
        date: day,
        count: found ? found.value : 0,
        level: found ? found.level : "low",
      });
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
      const monthStr = formatTime.dateTime(firstDayOfWeek, { month: "short" });
      const minGap = dateRange === "90" ? 1 : 2;

      if (monthStr !== lastMonthStr) {
        if (index - lastIndex > minGap) {
          monthLabels.push({ label: monthStr, index });
          lastMonthStr = monthStr;
          lastIndex = index;
        }
      }
    });

    return { weeks: weeksData, months: monthLabels };
  }, [dateRange, data, formatTime]);

  if (isPending) {
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="h-6 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </CardHeader>
          <CardContent>
            <div className="h-48 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div className="h-6 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </CardHeader>
          <CardContent>
            <div className="h-48 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("error.title") || "Error"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground py-8 text-center">
            <p>
              {t("error.description") ||
                "Failed to load activity charts. Please try again later."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="mt-4"
            >
              {t("error.retry") || "Retry"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const render7Days = () => (
    <div className="flex w-full items-end gap-2">
      {/* ตัดเอาแค่ 7 วันล่าสุด */}
      {data.heatmapData.map((item: HeatmapData, index: number) => (
        <div key={index} className="flex flex-1 flex-col items-center">
          <TooltipProvider>
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    "h-12 w-full rounded-lg shadow-sm transition-all hover:scale-110",
                    getHeatmapColor(item.level),
                  )}
                />
              </TooltipTrigger>

              <TooltipContent>
                <p>
                  {t("heatmap.tooltip", {
                    date: formatTime.dateTime(new Date(item.date), {
                      month: "short",
                      day: "numeric",
                    }),
                    count: item.value,
                  })}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span className="text-muted-foreground text-sm">
            {formatTime.dateTime(new Date(item.date), {
              weekday: "short",
            })}
          </span>
        </div>
      ))}
    </div>
  );

  const render30Days = () => (
    <div>
      <div className="flex gap-1">
        {/* ตัดเอาแค่ 30 วันล่าสุด */}
        {data.heatmapData.map((item: HeatmapData, index: number) => (
          <div key={index} className="flex flex-1 flex-col items-center">
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "h-12 w-full rounded-lg shadow-sm transition-all hover:scale-110",
                      getHeatmapColor(item.level),
                    )}
                  />
                </TooltipTrigger>

                <TooltipContent>
                  <p>
                    {t("heatmap.tooltip", {
                      date: formatTime.dateTime(new Date(item.date), {
                        month: "short",
                        day: "numeric",
                      }),
                      count: item.value,
                    })}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        ))}
      </div>
      {/* Show only first and last date labels */}
      <div className="text-muted-foreground flex justify-between px-1 text-sm">
        <span>
          {formatTime.dateTime(new Date(data.heatmapData[0].date), {
            month: "short",
            day: "numeric",
          })}
        </span>
        <span>
          {formatTime.dateTime(
            new Date(data.heatmapData[data.heatmapData.length - 1].date),
            {
              month: "short",
              day: "numeric",
            },
          )}
        </span>
      </div>
    </div>
  );

  const renderActivityGrid = () => {
    const getDayLabels = () => {
      const startDate = new Date(2024, 0, 7);
      return Array.from({ length: 7 }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        return formatTime.dateTime(date, { weekday: "short" });
      });
    };

    const DAYS = getDayLabels();
    const GAP_SIZE = 4;

    return (
      <div className="flex w-full">
        <div
          className="mr-3 flex shrink-0 flex-col pt-[24px]"
          style={{ gap: `${GAP_SIZE}px` }}
        >
          {DAYS.map((day, index) => (
            <span
              key={index}
              className="text-muted-foreground flex w-[24px] items-center justify-end text-[10px]"
              style={{ height: `${blockSize}px` }}
            >
              {/* Show label only for Mon/Wed/Fri to reduce clutter if small, or all if big */}
              {blockSize > 15 || [1, 3, 5].includes(index) ? day : ""}
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
                                    getHeatmapColor(day.level),
                                  ),
                            )}
                          />
                        </TooltipTrigger>
                        {!isFuture && (
                          <TooltipContent side="top">
                            <div className="text-center text-xs">
                              <p className="font-semibold">
                                {t("heatmap.tooltip", {
                                  date: formatTime.dateTime(
                                    new Date(day.date),
                                    {
                                      month: "short",
                                      day: "numeric",
                                    },
                                  ),
                                  count: day.count,
                                })}
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
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t("title")}</h2>
        <p className="text-muted-foreground">
          {t("description")}
          {dateRange && (
            <span className="ml-2 text-sm">
              ({t(`timeframe.${dateRange}`)})
            </span>
          )}
        </p>
      </div>

      {/* Activity Heatmap - Middle Section */}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {t("heatmap.title")}
          </CardTitle>
          <CardDescription>
            {t("heatmap.description")}
            {dateRange === "7" && ` ${t("heatmap.range.7")}`}
            {dateRange === "30" && ` ${t("heatmap.range.30")}`}
            {dateRange === "90" && ` ${t("heatmap.range.90")}`}
            {dateRange === "all" && ` ${t("heatmap.range.all")}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Heatmap Grid */}
            <div className="w-full overflow-x-auto lg:overflow-x-visible">
              {dateRange === "7" && render7Days()}
              {dateRange === "30" && render30Days()}
              {(dateRange === "90" || dateRange === "all") && (
                <div className="scrollbar-hide">{renderActivityGrid()}</div>
              )}
            </div>

            {/* Legend */}
            <div className="text-muted-foreground flex items-center justify-between text-sm">
              <span>{t("legend.less")}</span>
              <div className="flex items-center gap-1">
                <div
                  className={`h-4 w-4 rounded-sm bg-gray-200 dark:bg-gray-700`}
                />
                <div className={`h-4 w-4 rounded-sm bg-green-300`} />
                <div className={`h-4 w-4 rounded-sm bg-green-500`} />
                <div className={`h-4 w-4 rounded-sm bg-green-600`} />
              </div>
              <span>{t("legend.more")}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Charts - Top Section */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("daily.title")}</CardTitle>
            <CardDescription>{t("daily.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <AreaChart data={data.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="activity"
                  stroke="var(--color-activity)"
                  fill="var(--color-activity)"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("engagement.title")}</CardTitle>
            <CardDescription>{t("engagement.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig}>
              <BarChart data={data.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="users" fill="var(--color-users)" />
                <Bar dataKey="sessions" fill="var(--color-sessions)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Timeline - Bottom Section */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>{t("timeline.title")}</CardTitle>
              <CardDescription>{t("timeline.description")}</CardDescription>
            </div>
            <Select
              value={
                (table.getColumn("type")?.getFilterValue() as string) ?? "all"
              }
              onValueChange={(event) =>
                table
                  .getColumn("type")
                  ?.setFilterValue(event === "all" ? undefined : event)
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t("timeline.filterByType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("timeline.allTypes")}</SelectItem>
                <SelectItem value="reading">{t("types.reading")}</SelectItem>
                <SelectItem value="practice">{t("types.practice")}</SelectItem>
                <SelectItem value="assessment">
                  {t("types.assessment")}
                </SelectItem>
                <SelectItem value="achievement">
                  {t("types.achievement")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Activity Table */}
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        return (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(
                                  header.column.columnDef.header,
                                  header.getContext(),
                                )}
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center"
                      >
                        {t("timeline.empty")}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-end space-x-2 py-4">
              <div className="text-muted-foreground flex-1 text-sm">
                {t("timeline.pagination.showing", {
                  start:
                    table.getState().pagination.pageIndex *
                      table.getState().pagination.pageSize +
                    1,
                  end:
                    table.getState().pagination.pageIndex *
                      table.getState().pagination.pageSize +
                    table.getRowModel().rows.length,
                  total: table.getFilteredRowModel().rows.length,
                })}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden md:inline">
                    {t("timeline.pagination.previous")}
                  </span>
                </Button>
                <div className="flex items-center gap-1">
                  <span className="text-sm">
                    {t("timeline.pagination.page")}{" "}
                    {table.getState().pagination.pageIndex + 1}{" "}
                    {t("timeline.pagination.of")} {table.getPageCount()}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  <span className="hidden md:inline">
                    {t("timeline.pagination.next")}
                  </span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
