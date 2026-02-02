"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";
import { saveAs } from "file-saver";

interface Article {
  id: string;
  title: string;
}

export default function ExportWorkbookButton(article: Article) {
  const t = useTranslations("Components.exportWorkbookButton");
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);

      // Call the new export-workbook API endpoint
      const response = await fetch(
        `/api/articles/${article.id}/export-workbook`,
      );

      const workbookData = await response.json();

      const JsonData = JSON.stringify(workbookData.data, null, 2);
      const blob = new Blob([JsonData], { type: "application/json" });
      saveAs(blob, `${article.title} Workbook.json`);
    } catch (error) {
      console.error("Failed to export workbook data", error);
      toast.error(t("error"), {
        richColors: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button className="gap-2" onClick={handleExport} disabled={loading}>
      <Download className="h-4 w-4" />
      {loading ? t("exporting") : t("buttonText")}
    </Button>
  );
}
