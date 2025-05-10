import React from "react";
import Link from "next/link";
import { Badge } from "../ui/badge";
import { usePathname } from "next/navigation";
import { ArticleShowcase } from "@/types";
import { ActivityStatus, ActivityType } from "@/types/enum";
import { StarRating } from "../ui/rating";

type Props = {
  article: ArticleShowcase;
  userId?: string;
};

async function getTranslateSentence(
  articleId: string,
  targetLanguage: string
): Promise<{ message: string; translated_sentences: string[] }> {
  try {
    const res = await fetch(`/api/v1/assistant/translate/${articleId}`, {
      method: "POST",
      body: JSON.stringify({ type: "summary", targetLanguage }),
    });
    const data = await res.json();
    return data;
  } catch (error) {
    return { message: "error", translated_sentences: [] };
  }
}

const ArticleShowcaseCard = React.forwardRef<HTMLDivElement, Props>(
  ({ article, userId }, ref) => {
    const [summarySentence, setSummarySentence] = React.useState<string[]>([]);
    const pathName = usePathname();
    const systemPathRegex = /\/(?:[a-z]{2}\/)?system\/.*\/?$/i;

    // React.useEffect(() => {
    //   handleTranslateSummary();
    // }, [article, locale]);

    // async function handleTranslateSummary() {
    //   const articleId = article.id;
    //   if (!locale || locale === "en") {
    //     return;
    //   }
    //   type ExtendedLocale = "th" | "cn" | "tw" | "vi" | "zh-CN" | "zh-TW";
    //   let localeTarget: ExtendedLocale = locale as ExtendedLocale;

    //   switch (locale) {
    //     case "cn":
    //       localeTarget = "zh-CN";
    //       break;
    //     case "tw":
    //       localeTarget = "zh-TW";
    //       break;
    //   }

    //   const data = await getTranslateSentence(articleId, localeTarget);

    //   setSummarySentence(data.translated_sentences);
    // }

    return (
      <Link
        href={`/student/read/${article.id}`}
        // onClick={() =>
        //   fetch(`/api/v1/users/${userId}/activitylog`, {
        //     method: "POST",
        //     body: JSON.stringify({
        //       articleId: article.id,
        //       activityType: ActivityType.ArticleRead,
        //       activityStatus: ActivityStatus.InProgress,
        //       details: {
        //         title: article.title,
        //         level: article.raLevel,
        //         cefr_level: article.cefrLevel,
        //         type: article.type,
        //         genre: article.genre,
        //         subgenre: article.subGenre,
        //       },
        //     }),
        //   })
        // }
      >
        <div
          ref={ref}
          className="w-full flex flex-col gap-1 h-[20rem] bg-cover bg-center p-3 rounded-md hover:scale-105 transition-all duration-300 bg-black "
          style={{
            backgroundImage: `url(/images/${article.id}.png)`,
            boxShadow: "inset 80px 10px 90px 10px rgba(0, 0, 0, 0.9)",
            opacity:
              article.is_read ||
              (article.is_approved && systemPathRegex.test(pathName))
                ? 0.3
                : 1,
          }}
        >
          {article.raLevel && (
            <Badge className="shadow-lg max-w-max" variant="destructive">
              Reading Advantage Level: {article.raLevel}
            </Badge>
          )}
          <Badge className="shadow-lg max-w-max" variant="destructive">
            CEFR Level: {article.cefrLevel}
          </Badge>
          <Badge className="shadow-lg max-w-max" variant="destructive">
            {article.genre}, {article.subGenre}
          </Badge>
          <Badge className="shadow-lg max-w-max" variant="destructive">
            <StarRating />
            {/* <Rating name="read-only" value={article.average_rating} readOnly /> */}
          </Badge>
          <div className="mt-auto">
            <div className=" bg-black bg-opacity-40">
              <p className="text-xl drop-shadow-lg font-bold text-white">
                {article.title}
              </p>
            </div>
            <div className=" bg-black bg-opacity-40">
              <div className="text-sm drop-shadow-lg line-clamp-4 text-white">
                {/* {locale == "en" ? (
                  <p>{article.summary}</p>
                ) : (
                  <p>{summarySentence}</p>
                )} */}
                <p>{article.summary}</p>
              </div>
            </div>
          </div>
        </div>
        {article.is_read && !article.is_completed && (
          <div className="flex justify-center">
            <Badge className="relative m-auto -top-[11rem] text-md left-0 right-0 shadow-lg max-w-max bg-slate-200 text-slate-900">
              Started
            </Badge>
          </div>
        )}

        {article.is_read && article.is_completed && (
          <div className="flex justify-center">
            <Badge className="relative m-auto -top-[11rem] text-md left-0 right-0 shadow-lg max-w-max bg-slate-200 text-slate-900">
              Completed
            </Badge>
          </div>
        )}

        {article.is_approved && systemPathRegex.test(pathName) && (
          <div className="flex justify-center">
            <Badge className="relative m-auto -top-[11rem] text-md left-0 right-0 shadow-lg max-w-max bg-slate-200 text-slate-900">
              Approved
            </Badge>
          </div>
        )}
      </Link>
    );
  }
);

ArticleShowcaseCard.displayName = "ArticleShowcaseCard";

export default React.memo(ArticleShowcaseCard);
