import AdminArticleCreation from "@/components/admin/article-creation";
import { Header } from "@/components/header";
import { Separator } from "@/components/ui/separator";
import React from "react";
import { getTranslations } from "next-intl/server";

/**
 * Renders the admin article creation page with a header and article creation form.
 */
export default async function ArticleCreationPage() {
  const t = await getTranslations("AdminArticleCreationPage.header");
  return (
    <div>
      <Header heading={t("heading")} text={t("text")} />
      <Separator className="my-4" />
      <AdminArticleCreation />
    </div>
  );
}
