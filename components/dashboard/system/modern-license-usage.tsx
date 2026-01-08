"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronLeft,
  ChevronRight,
  School,
  Users,
  Calendar,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { fetchLicensesApi } from "@/utils/api-request";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface License {
  id: string;
  schoolName: string;
  licenseType: string;
  usedLicenses: number;
  maxUsers: number;
  expiresAt: string;
}

export default function ModernLicenseUsage() {
  const t = useTranslations("Components.modernLicenseUsage");
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["licenses"],
    queryFn: fetchLicensesApi,
  });

  const nextLicense = () => {
    setCurrentIndex((prev) => (prev + 1) % (data?.length || 0));
  };

  const prevLicense = () => {
    setCurrentIndex(
      (prev) => (prev - 1 + (data?.length || 0)) % (data?.length || 0),
    );
  };

  if (isPending) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-8 w-full" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </div>
    );
  }

  if (data && Object.keys(data).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <School className="text-muted-foreground mb-4 h-12 w-12" />
        <h3 className="mb-2 text-lg font-medium">{t("noLicenses.title")}</h3>
        <p className="text-muted-foreground text-sm">
          {t("noLicenses.description")}
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="text-muted-foreground mb-4 h-12 w-12" />
        <h3 className="mb-2 text-lg font-medium">Error</h3>
        <p className="text-muted-foreground text-sm">{error?.message}</p>
      </div>
    );
  }

  const currentLicense = data?.[currentIndex];
  const usagePercentage =
    (currentLicense.School?._count.users / currentLicense.maxUsers) * 100;
  const isNearLimit = usagePercentage >= 80;
  const isExpiringSoon =
    new Date(currentLicense.expiryDate) <=
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  return (
    <div className="space-y-6">
      {/* Header with navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t("title")}</h3>
          <p className="text-muted-foreground text-sm">
            {data?.length} {t("schools.total", { count: data?.length })}
          </p>
        </div>

        {data?.length > 1 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={prevLicense}
              disabled={data?.length <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-muted-foreground px-2 text-sm">
              {currentIndex + 1} {t("of")} {data?.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={nextLicense}
              disabled={data?.length <= 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* License details */}
      <div className="space-y-4">
        {/* School info */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <School className="text-muted-foreground h-4 w-4" />
            <span className="font-medium">{currentLicense.name}</span>
          </div>
          <Badge
            variant={
              currentLicense.subscription === "PREMIUM"
                ? "default"
                : "secondary"
            }
          >
            {currentLicense.subscription}
          </Badge>
        </div>

        {/* Usage progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <Users className="text-muted-foreground h-4 w-4" />
              <span>{t("labels.usage")}</span>
            </div>
            <span className="font-medium">
              {currentLicense.School?._count.users} / {currentLicense.maxUsers}
            </span>
          </div>

          <Progress
            value={usagePercentage}
            className={`h-3 ${isNearLimit ? "progress-warning" : ""}`}
          />

          <div className="text-muted-foreground flex items-center justify-between text-xs">
            <span>0</span>
            <span
              className={`font-medium ${isNearLimit ? "text-orange-600" : ""}`}
            >
              {usagePercentage.toFixed(1)}% {t("labels.used")}
            </span>
            <span>{currentLicense.maxUsers}</span>
          </div>
        </div>

        {/* Expiration info */}
        <div className="bg-muted/50 flex items-center justify-between rounded-lg p-3">
          <div className="flex items-center gap-2">
            <Calendar className="text-muted-foreground h-4 w-4" />
            <span className="text-sm">{t("labels.expires")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {format(new Date(currentLicense.expiryDate), "dd/MM/yyyy")}
            </span>
            {isExpiringSoon ? (
              <AlertCircle className="h-4 w-4 text-orange-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
          </div>
        </div>

        {/* Warnings */}
        {(isNearLimit || isExpiringSoon) && (
          <div className="space-y-2">
            {isNearLimit && (
              <div className="flex items-center gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 dark:border-orange-800 dark:bg-orange-900/20">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <span className="text-sm text-orange-800 dark:text-orange-200">
                  {t("warnings.nearLimit")}
                </span>
              </div>
            )}
            {isExpiringSoon && (
              <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
                <Calendar className="h-4 w-4 text-yellow-600" />
                <span className="text-sm text-yellow-800 dark:text-yellow-200">
                  {t("warnings.expiresSoon")}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
