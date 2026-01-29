import { Suspense } from "react";
import { notFound } from "next/navigation";
import ChapterPageContent from "@/components/stories/chapter-page-content";
import ChapterLoadingSkeleton from "./loading";

interface PageProps {
  params: Promise<{
    locale: string;
    storieId: string;
    chapterNum: string;
  }>;
}

// Server Component - fetch data on server
export default async function StorieChapterPage({ params }: PageProps) {
  const { storieId, chapterNum } = await params;
  const chapterNumber = parseInt(chapterNum, 10);

  // Validate chapter number
  if (isNaN(chapterNumber) || chapterNumber < 1) {
    notFound();
  }

  return (
    <Suspense fallback={<ChapterLoadingSkeleton />}>
      <ChapterPageContent storyId={storieId} chapterNumber={chapterNumber} />
    </Suspense>
  );
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps) {
  const { storieId, chapterNum } = await params;

  return {
    title: `Chapter ${chapterNum} | Story`,
    description: `Read chapter ${chapterNum} of this educational story`,
    openGraph: {
      title: `Chapter ${chapterNum}`,
      description: `Read and listen to chapter ${chapterNum}`,
      type: "article",
    },
  };
}
