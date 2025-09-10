import AdminArticleCreation from "@/components/admin/article-creation";
import { Header } from "@/components/header";
import { Separator } from "@/components/ui/separator";
import React from "react";

export default function ArticleCreationPage() {
  return (
    <div>
      <Header
        heading="Article Creation & Management"
        text="Create, generate, and approve articles for Primar Advantage"
      />
      <Separator className="my-4" />
      <AdminArticleCreation />
    </div>
  );
}
