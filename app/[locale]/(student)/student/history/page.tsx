import React from "react";
import { Header } from "@/components/header";
import { getTranslations } from "next-intl/server";
import { ArticleRecordsTable } from "@/components/dashboard/article-records-table";
import { ReminderRereadTable } from "@/components/dashboard/reminder-reread-table";

export default async function HistoryPage() {
  return (
    <>
      <Header
        heading="Reminder to Reread"
        text="Reminder to Reread Description"
        variant="warning"
      />
      <ReminderRereadTable />
      <Header heading="Article Records" text="Article Records Description" />
      <ArticleRecordsTable />
    </>
  );
}
