"use client";

/**
 * AiConfigTabs — the tabbed shell for the AI Config admin page.
 *
 * Tab state is persisted in the URL via the `tab` query param so a page
 * refresh keeps the user on the same tab. Uses useSearchParams +
 * router.replace (Next.js App Router pattern already used elsewhere in
 * this project).
 *
 * Highlight param: ?highlight=article.generate,story.generate
 * When set, the Tasks tab scrolls to and visually highlights those rows.
 */

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { ProvidersTab } from "./providers-tab";
import { TasksTab } from "./tasks-tab";

const STRINGS = {
  tabs: {
    providers: "Providers",
    tasks: "Task Assignments",
  },
} as const;

const VALID_TABS = ["providers", "tasks"] as const;
type TabValue = (typeof VALID_TABS)[number];

export function AiConfigTabs() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rawTab = searchParams.get("tab");
  const activeTab: TabValue =
    VALID_TABS.includes(rawTab as TabValue) ? (rawTab as TabValue) : "providers";

  const highlightParam = searchParams.get("highlight");
  const highlightKeys = highlightParam ? highlightParam.split(",").filter(Boolean) : [];

  const setTab = useCallback(
    (tab: TabValue) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", tab);
      // Clear highlight when user navigates away manually
      if (tab !== "tasks") params.delete("highlight");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const navigateToTasks = useCallback(
    (highlightTaskKeys?: string[]) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("tab", "tasks");
      if (highlightTaskKeys && highlightTaskKeys.length > 0) {
        params.set("highlight", highlightTaskKeys.join(","));
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  return (
    <Tabs value={activeTab} onValueChange={(v) => setTab(v as TabValue)}>
      <TabsList className="w-full md:w-auto">
        <TabsTrigger value="providers" className="flex-1 md:flex-none">
          {STRINGS.tabs.providers}
        </TabsTrigger>
        <TabsTrigger value="tasks" className="flex-1 md:flex-none">
          {STRINGS.tabs.tasks}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="providers" className="mt-4">
        <ProvidersTab onNavigateToTasks={navigateToTasks} />
      </TabsContent>

      <TabsContent value="tasks" className="mt-4">
        <TasksTab highlightTaskKeys={highlightKeys} />
      </TabsContent>
    </Tabs>
  );
}
