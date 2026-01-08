"use client";

import React from "react";
import { WidgetShell } from "@/components/dashboard/widget-shell";
import { KPICard } from "@/components/dashboard/kpi-card";
import { TrendingUp, Clock, Target, Activity } from "lucide-react";
import { VelocityMetrics } from "@/server/models/studentModel";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";

interface XPVelocityWidgetProps {
  data: VelocityMetrics | null;
  loading?: boolean;
  onRefresh?: () => void;
}

export function XPVelocityWidget({
  data,
  loading = false,
  onRefresh,
}: XPVelocityWidgetProps) {
  const t = useTranslations("Student.Dashboard.xpVelocity");
  const chartData = React.useMemo(() => {
    if (!data) return [];
    return [
      {
        period: t("period.7d"),
        value: data.xpPerCalendarDay7d,
        label: t("label.7dAvg"),
      },
      {
        period: t("period.30d"),
        value: data.xpPerCalendarDay30d,
        label: t("label.30dAvg"),
      },
      {
        period: t("period.ema"),
        value: data.emaVelocity,
        label: t("label.trend"),
      },
    ];
  }, [data]);

  const getTrendDirection = (): "up" | "down" | "neutral" => {
    if (!data) return "neutral";
    if (data.xpPerCalendarDay7d > data.xpPerCalendarDay30d) return "up";
    if (data.xpPerCalendarDay7d < data.xpPerCalendarDay30d) return "down";
    return "neutral";
  };

  if (!data && !loading) {
    return (
      <WidgetShell
        title={t("title")}
        description={t("description")}
        icon={TrendingUp}
        isEmpty
        emptyMessage={t("emptyMessage")}
        onRefresh={onRefresh}
      >
        <div />
      </WidgetShell>
    );
  }

  return (
    <WidgetShell
      title={t("title")}
      description={t("overview")}
      icon={TrendingUp}
      loading={loading}
      onRefresh={onRefresh}
      telemetryId="student.xp_velocity"
    >
      <div className="space-y-4" role="region" aria-label={t("ariaLabel")}>
        <div
          className="grid grid-cols-2 gap-4"
          role="group"
          aria-label={t("quickStats")}
        >
          <KPICard
            title={t("kpi.7dayAvg")}
            value={data?.xpPerCalendarDay7d?.toFixed(1) || "0"}
            description={t("kpi.xpPerDay")}
            icon={Activity}
            loading={loading}
            trend={{
              value: data?.xpPerCalendarDay7d || 0,
              direction: getTrendDirection(),
            }}
          />
          <KPICard
            title={t("kpi.activeDays")}
            value={data?.activeDays7d || 0}
            description={t("kpi.last7Days")}
            icon={Clock}
            loading={loading}
          />
        </div>

        <Card>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <XAxis
                  dataKey="label"
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value.toFixed(0)}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-background rounded-lg border p-2 shadow-sm">
                          <div className="grid gap-2">
                            <div className="flex flex-col">
                              <span className="text-muted-foreground text-[0.70rem] uppercase">
                                {payload[0].payload.period}
                              </span>
                              <span className="text-muted-foreground font-bold">
                                {payload[0].value} {t("units.xpPerDay")}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  strokeWidth={2}
                  activeDot={{
                    r: 6,
                    style: { fill: "var(--primary)" },
                  }}
                  style={{
                    stroke: "var(--primary)",
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {data?.isLowSignal && (
          <p className="text-muted-foreground text-xs">{t("tip")}</p>
        )}
      </div>
    </WidgetShell>
  );
}
