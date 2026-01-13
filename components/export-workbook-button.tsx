"use client";

import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { toast } from "sonner";

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
        `/api/articles/${article.id}/export-workbook?type=article`,
      );

      //   if (!response.ok) {
      //     throw new Error(`Failed to export workbook: ${response.statusText}`);
      //   }

      const workbookData = await response.json();

      console.log(workbookData);

      // Trigger Download
      const dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(workbookData, null, 2));
      const downloadAnchorNode = document.createElement("a");
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute(
        "download",
        `${article.title.replace(/\s+/g, "_")}_workbook.json`,
      );
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
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
