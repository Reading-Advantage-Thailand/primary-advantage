"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { WidgetShell } from "@/components/dashboard/widget-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert as AlertType } from "@/types/dashboard";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  Bell,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminDashboardApi } from "@/utils/api-request";
import { Role } from "@/types/enum";
import { useCurrentUser } from "@/hooks/use-current-user";

interface AlertCenterProps {
  licenseId?: string;
  dateRange?: string;
  maxAlerts?: number;
  onAlertClick?: (alert: AlertType) => void;
  onViewAll?: () => void;
  className?: string;
}

/**
 * AlertCenter Component
 * Displays system alerts and notifications for admin users
 * Uses TanStack Query to fetch data from admin dashboard API
 */
export default function AlertCenter({
  licenseId,
  dateRange = "30",
  maxAlerts = 5,
  onAlertClick,
  onViewAll,
  className,
}: AlertCenterProps) {
  const [filter, setFilter] = useState<"all" | "critical" | "unacknowledged">(
    "unacknowledged",
  );
  const [showAllDialog, setShowAllDialog] = useState(false);
  const [dialogFilter, setDialogFilter] = useState<
    "all" | "critical" | "unacknowledged"
  >("all");
  const t = useTranslations("Components.alertCenter");
  const { user } = useCurrentUser();
  // Fetch dashboard data using TanStack Query
  const {
    data: dashboardData,
    isPending,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["admin-dashboard", licenseId, dateRange],
    queryFn: () => fetchAdminDashboardApi(licenseId, dateRange),
    enabled:
      user?.role === Role.admin
        ? true
        : user?.role === Role.system && !!licenseId,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });

  // Extract alerts from dashboard data
  const alerts = dashboardData?.alerts || [];
  const alertsSummary = dashboardData?.alertsSummary || {
    total: 0,
    critical: 0,
    unacknowledged: 0,
  };

  // Filter alerts based on selected filter
  const filteredAlerts = alerts
    .filter((alert: AlertType) => {
      if (filter === "critical") return alert.severity === "critical";
      if (filter === "unacknowledged") return !alert.acknowledged;
      return true;
    })
    .slice(0, maxAlerts);

  const getSeverityIcon = (severity: AlertType["severity"]) => {
    switch (severity) {
      case "critical":
        return AlertCircle;
      case "high":
        return AlertTriangle;
      case "medium":
        return Info;
      default:
        return Bell;
    }
  };

  const getSeverityColor = (severity: AlertType["severity"]) => {
    switch (severity) {
      case "critical":
        return "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900";
      case "high":
        return "text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900";
      case "medium":
        return "text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900";
      default:
        return "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900";
    }
  };

  const getTypeLabel = (type: AlertType["type"]) => {
    switch (type) {
      case "warning":
        return "Warning";
      case "error":
        return "Error";
      default:
        return "Info";
    }
  };

  // const handleAcknowledge = async (alertId: string, e: React.MouseEvent) => {
  //   e.stopPropagation();

  //   try {
  //     const response = await fetch(
  //       `/api/v1/admin/alerts/${alertId}/acknowledge`,
  //       {
  //         method: "POST",
  //       },
  //     );

  //     if (response.ok) {
  //       setAlerts((prev) =>
  //         prev.map((alert) =>
  //           alert.id === alertId ? { ...alert, acknowledged: true } : alert,
  //         ),
  //       );
  //     }
  //   } catch (err) {
  //     console.error("Failed to acknowledge alert:", err);
  //   }
  // };

  // Get counts from summary
  const criticalCount = alertsSummary.critical;
  const unacknowledgedCount = alertsSummary.unacknowledged;

  const handleViewAll = () => {
    setShowAllDialog(true);
    onViewAll?.();
  };

  // Filter alerts for dialog view
  const getDialogFilteredAlerts = (): AlertType[] => {
    return alerts.filter((alert: AlertType) => {
      if (dialogFilter === "critical") return alert.severity === "critical";
      if (dialogFilter === "unacknowledged") return !alert.acknowledged;
      return true;
    });
  };

  const dialogFilteredAlerts = getDialogFilteredAlerts();

  return (
    <>
      <WidgetShell
        title={t("title")}
        description={`${unacknowledgedCount} ${t("unacknowledged")}`}
        icon={Bell}
        loading={isPending}
        error={isError ? error?.message || "Failed to load alerts" : null}
        isEmpty={filteredAlerts.length === 0}
        emptyMessage={t("noAlerts")}
        emptyIcon={CheckCircle2}
        onRefresh={refetch}
        onViewAll={handleViewAll}
        viewAllLabel={t("viewAll")}
        className={className}
        headerAction={
          <div className="flex gap-1 rounded-md border p-1">
            <button
              className={cn(
                "rounded px-2 py-1 text-xs transition-colors",
                filter === "unacknowledged" &&
                  "bg-primary text-primary-foreground",
              )}
              onClick={() => setFilter("unacknowledged")}
            >
              {t("filter.unread")}
              {unacknowledgedCount > 0 && (
                <span className="ml-1 rounded-full bg-red-500 px-1 text-[10px] text-white">
                  {unacknowledgedCount}
                </span>
              )}
            </button>
            <button
              className={cn(
                "rounded px-2 py-1 text-xs transition-colors",
                filter === "critical" && "bg-primary text-primary-foreground",
              )}
              onClick={() => setFilter("critical")}
            >
              {t("filter.critical")}
              {criticalCount > 0 && (
                <span className="ml-1 rounded-full bg-red-500 px-1 text-[10px] text-white">
                  {criticalCount}
                </span>
              )}
            </button>
            <button
              className={cn(
                "rounded px-2 py-1 text-xs transition-colors",
                filter === "all" && "bg-primary text-primary-foreground",
              )}
              onClick={() => setFilter("all")}
            >
              {t("filter.all")}
            </button>
          </div>
        }
      >
        <div className="space-y-3">
          {filteredAlerts.map((alert: AlertType) => {
            const SeverityIcon = getSeverityIcon(alert.severity);

            return (
              <div
                key={alert.id}
                className={cn(
                  "rounded-lg border p-3 transition-all hover:shadow-md",
                  getSeverityColor(alert.severity),
                  alert.acknowledged && "opacity-60",
                )}
              >
                <div className="flex items-start gap-3">
                  <SeverityIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <h4 className="line-clamp-1 text-sm font-semibold">
                        {alert.title}
                      </h4>
                      <Badge
                        variant="outline"
                        className="flex-shrink-0 text-xs"
                      >
                        {getTypeLabel(alert.type)}
                      </Badge>
                    </div>
                    <p className="mb-2 line-clamp-2 text-xs">{alert.message}</p>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-xs">
                        {alert.schoolName && (
                          <span className="font-medium">
                            {alert.schoolName}
                          </span>
                        )}
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(alert.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                      {!alert.acknowledged && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-xs"
                          // onClick={(e) => handleAcknowledge(alert.id, e)}
                        >
                          {t("markRead")}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </WidgetShell>

      {/* View All Alerts Dialog */}
      <Dialog open={showAllDialog} onOpenChange={setShowAllDialog}>
        <DialogContent className="max-h-[80vh] max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              {t("dialog.title")}
            </DialogTitle>
            <DialogDescription>
              {alertsSummary.total} {t("dialog.total")} • {unacknowledgedCount}{" "}
              {t("unacknowledged")} • {criticalCount} {t("filter.critical")}
            </DialogDescription>
          </DialogHeader>

          {/* Filter Buttons */}
          <div className="flex gap-2 border-b pb-3">
            <Button
              variant={dialogFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setDialogFilter("all")}
            >
              {t("dialog.all")} ({alertsSummary.total})
            </Button>
            <Button
              variant={
                dialogFilter === "unacknowledged" ? "default" : "outline"
              }
              size="sm"
              onClick={() => setDialogFilter("unacknowledged")}
            >
              {t("dialog.unread")} ({unacknowledgedCount})
            </Button>
            <Button
              variant={dialogFilter === "critical" ? "default" : "outline"}
              size="sm"
              onClick={() => setDialogFilter("critical")}
            >
              {t("dialog.critical")} ({criticalCount})
            </Button>
          </div>

          {/* Alerts List */}
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {dialogFilteredAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CheckCircle2 className="text-muted-foreground mb-3 h-12 w-12" />
                  <p className="text-muted-foreground text-sm">
                    {t("dialog.noAlertsCategory")}
                  </p>
                </div>
              ) : (
                dialogFilteredAlerts.map((alert: AlertType) => {
                  const SeverityIcon = getSeverityIcon(alert.severity);

                  return (
                    <div
                      key={alert.id}
                      className={cn(
                        "rounded-lg border p-4 transition-all hover:shadow-md",
                        getSeverityColor(alert.severity),
                        alert.acknowledged && "opacity-60",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <SeverityIcon className="mt-0.5 h-5 w-5 flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="mb-1 flex items-center gap-2">
                                <h4 className="text-sm font-semibold">
                                  {alert.title}
                                </h4>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-xs",
                                    alert.severity === "critical" &&
                                      "border-red-500 text-red-700 dark:text-red-400",
                                    alert.severity === "high" &&
                                      "border-orange-500 text-orange-700 dark:text-orange-400",
                                  )}
                                >
                                  {alert.severity}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {getTypeLabel(alert.type)}
                                </Badge>
                                {alert.acknowledged && (
                                  <Badge variant="outline" className="text-xs">
                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                    {t("read")}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <p className="mb-3 text-sm">{alert.message}</p>

                          <div className="flex items-center justify-between gap-2 border-t pt-2">
                            <div className="text-muted-foreground flex items-center gap-3 text-xs">
                              {alert.schoolName && (
                                <span className="text-foreground font-medium">
                                  {alert.schoolName}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(
                                  new Date(alert.createdAt),
                                  { addSuffix: true },
                                )}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              {!alert.acknowledged && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-xs"
                                  // onClick={(e) => {
                                  //   e.stopPropagation();
                                  //   handleAcknowledge(alert.id, e);
                                  // }}
                                >
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  {t("markRead")}
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => {
                                  onAlertClick?.(alert);
                                  setShowAllDialog(false);
                                }}
                              >
                                {t("viewDetails")}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
