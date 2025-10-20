import LessonCard from "@/components/lesson/lesson-card";
import { currentUser } from "@/lib/session";
import { redirect, usePathname } from "next/navigation";
import React from "react";

export const metadata = {
  title: "Lesson",
  description: "Interactive Reading Lesson",
};

export default async function LessonPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) return redirect("/auth/signin");

  return (
    <div className="min-h-screen rounded-xl bg-gradient-to-b from-gray-50 to-white to-20% dark:from-slate-900 dark:to-[hsl(222.2_90%_4.9%)]">
      <div className="container mx-auto max-w-7xl px-4 py-6">
        <div className="relative">
          <LessonCard id={id} />
          {/* <ChatBotFloatingChatButton
            article={articleResponse?.article as Article}
          /> */}
        </div>
      </div>
    </div>
  );
}
