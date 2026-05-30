import { Suspense } from "react";
import type { Metadata } from "next";
import { Separator } from "@/components/ui/separator";
import { Header } from "@/components/header";
import { AiConfigTabs } from "@/components/system/ai-config/ai-config-tabs";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = {
  title: "AI Provider Config | Primary Advantage",
  description:
    "Manage AI providers and per-task model assignments for the platform.",
};

/**
 * System-level AI provider and task configuration page.
 *
 * Auth: this page lives under /system/**, which is gated by the system layout
 * and the AppLayout sidebar that only surfaces system nav to users with the
 * system role (same pattern as /system/dashboard, /system/schools, etc.).
 * The underlying API routes enforce SYSTEM_ACCESS via withAuth().
 *
 * i18n: strings are English-only per ADR-0001 ("Admin UI: English only for now").
 * All user-facing text lives in STRINGS objects within each component file
 * to make a future i18n sweep mechanical.
 */
export default function AiConfigPage() {
  return (
    <div>
      <Header
        heading="AI Provider Config"
        text="Manage AI providers and per-task model assignments."
      />
      <Separator className="my-4" />
      {/*
        useSearchParams() inside AiConfigTabs requires a Suspense boundary
        (Next.js App Router requirement for client components reading search params).
      */}
      <Suspense
        fallback={
          <div className="space-y-4">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-64 w-full" />
          </div>
        }
      >
        <AiConfigTabs />
      </Suspense>
    </div>
  );
}
