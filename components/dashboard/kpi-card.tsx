"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
  LucideIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";

export interface KPICardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
    label?: string;
  };
  status?: "success" | "warning" | "error" | "info";
  tooltip?: string;
  dataSource?: string;
  loading?: boolean;
  className?: string;
  onClick?: () => void;
}

export function KPICard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  status,
  tooltip,
  dataSource,
  loading = false,
  className,
  onClick,
}: KPICardProps) {
  const t = useTranslations("Components.kpiCard");
  const getTrendIcon = () => {
    if (!trend) return null;

    switch (trend.direction) {
      case "up":
        return <TrendingUp className="h-4 w-4" />;
      case "down":
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getTrendColor = () => {
    if (!trend) return "";

    switch (trend.direction) {
      case "up":
        return "text-green-600 dark:text-green-400";
      case "down":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "success":
        return "border-green-500/20 bg-green-50/50 dark:bg-green-950/20";
      case "warning":
        return "border-yellow-500/20 bg-yellow-50/50 dark:bg-yellow-950/20";
      case "error":
        return "border-red-500/20 bg-red-50/50 dark:bg-red-950/20";
      case "info":
        return "border-blue-500/20 bg-blue-50/50 dark:bg-blue-950/20";
      default:
        return "";
    }
  };

  if (loading) {
    return (
      <Card className={cn("transition-all hover:shadow-md", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-[120px]" />
          <Skeleton className="h-5 w-5 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="mb-2 h-8 w-[100px]" />
          <Skeleton className="h-3 w-[140px]" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "transition-all hover:shadow-md",
        getStatusColor(),
        onClick && "cursor-pointer hover:scale-[1.02]",
        className,
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {(tooltip || dataSource) && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="text-muted-foreground h-4 w-4 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  {tooltip && <p>{tooltip}</p>}
                  {dataSource && (
                    <p className="text-muted-foreground mt-1 text-xs">
                      {t("source")}: {dataSource}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        {Icon && <Icon className="text-muted-foreground h-5 w-5" />}
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-1">
          <div className="text-2xl font-bold">{value}</div>
          {description && (
            <p className="text-muted-foreground text-xs">{description}</p>
          )}
          {trend && (
            <div
              className={cn(
                "mt-1 flex items-center gap-1 text-xs font-medium",
                getTrendColor(),
              )}
            >
              {getTrendIcon()}
              <span>
                {trend.value > 0 ? "+" : ""}
                {trend.value}%
              </span>
              {trend.label && (
                <span className="text-muted-foreground ml-1">
                  {trend.label}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function KPICardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("transition-all", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-[120px]" />
        <Skeleton className="h-5 w-5 rounded" />
      </CardHeader>
      <CardContent>
        <Skeleton className="mb-2 h-8 w-[100px]" />
        <Skeleton className="h-3 w-[140px]" />
      </CardContent>
    </Card>
  );
}
