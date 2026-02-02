"use client";

import { Button } from "@/components/ui/button";
import { Download, LoaderCircleIcon } from "lucide-react";
import { useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { toast } from "sonner";

interface ExportStoryWorkbooksButtonProps {
  storyId: string;
  storyTitle: string;
}

export default function ExportStoryWorkbooksButton({
  storyId,
  storyTitle,
}: ExportStoryWorkbooksButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);

    try {
      const zip = new JSZip();
      const folderName = storyTitle + " " + "Workbooks";
      const folder = zip.folder(folderName)!;

      const response = await fetch(`/api/stories/${storyId}/export-workbook`);
      if (!response.ok) throw new Error("Failed to fetch data");

      const allChapters = await response.json();

      allChapters.data.forEach((chapter: any) => {
        const fileName = `${chapter.lesson_number} ${chapter.lesson_title}.json`;

        folder.file(fileName, JSON.stringify(chapter, null, 2));
      });

      const content = await folder.generateAsync({ type: "blob" });
      saveAs(content, `${folderName}.zip`);
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while exporting the workbooks.", {
        richColors: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={loading}>
      {loading ? (
        <LoaderCircleIcon className="h-4 w-4 animate-spin" />
      ) : (
        <Download className="h-4 w-4" />
      )}
      Export Story Workbooks
    </Button>
  );
}
