import React from "react";
import Link from "next/link";
import { Badge } from "../ui/badge";
import { usePathname } from "next/navigation";
import { ArticleShowcase } from "@/types";
import { ActivityStatus, ActivityType } from "@/types/enum";
import StarRating from "../ui/rating";
import { useLocale, useTranslations } from "next-intl";
import { sanitizeTranslationKey } from "@/lib/utils";

type Props = {
  article: ArticleShowcase;
  userId?: string;
};

const ArticleShowcaseCard = React.forwardRef<HTMLDivElement, Props>(
  ({ article, userId }, ref) => {
    const locale = useLocale();
    const pathName = usePathname();
    const t = useTranslations("Article");
    const systemPathRegex = /\/(?:[a-z]{2}\/)?system\/.*\/?$/i;

    // Function to get the translated summary based on locale
    const getLocalizedSummary = () => {
      if (!locale || locale === "en") {
        return article.summary;
      }

      // Map locale to translatedSummary keys
      const localeKey = locale as "th" | "cn" | "tw" | "vi";

      return article.translatedSummary?.[localeKey] || article.summary;
    };

    return (
      <Link
        href={`/student/read/${article.id}`}
        // onClick={() =>
        //   fetch(`/api/users/${userId}/activitylog`, {
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
          className="flex h-[20rem] flex-col gap-1 rounded-md bg-black bg-cover bg-center p-3 transition-all duration-300 hover:scale-105"
          style={{
            backgroundImage: `url('https://storage.googleapis.com/primary-app-storage/images/${article.id}_1.png')`,
            boxShadow: "inset 80px 10px 90px 10px rgba(0, 0, 0, 0.9)",
            opacity:
              article.is_read ||
              (article.is_approved && systemPathRegex.test(pathName))
                ? 0.3
                : 1,
          }}
        >
          {article.raLevel && (
            <Badge className="max-w-max shadow-lg" variant="destructive">
              {t("raLevel", { level: article.raLevel ?? 0 })}
            </Badge>
          )}
          <Badge className="max-w-max shadow-lg" variant="destructive">
            {t("cefrLevel", { level: article.cefrLevel ?? 0 })}
          </Badge>
          {/* <Badge className="max-w-max shadow-lg" variant="destructive">
            {t(`subgenres.${sanitizeTranslationKey(article.subGenre ?? "")}`)},{" "}
            {t(`genres.${sanitizeTranslationKey(article.genre ?? "")}`)}
          </Badge> */}
          <Badge className="max-w-max shadow-lg" variant="destructive">
            <StarRating initialRating={article.rating} readOnly />
          </Badge>
          <div className="mt-auto">
            <div className="bg-black/40">
              <p className="text-xl font-bold text-white drop-shadow-lg">
                {article.title}
              </p>
            </div>
            <div className="bg-black/40">
              <div className="line-clamp-4 text-sm text-white drop-shadow-lg">
                <p>{getLocalizedSummary()}</p>
              </div>
            </div>
          </div>
        </div>
        {article.is_read && !article.is_completed && (
          <div className="flex justify-center">
            <Badge className="text-md relative -top-[11rem] right-0 left-0 m-auto max-w-max bg-slate-200 text-slate-900 shadow-lg">
              Started
            </Badge>
          </div>
        )}

        {article.is_read && article.is_completed && (
          <div className="flex justify-center">
            <Badge className="text-md relative -top-[11rem] right-0 left-0 m-auto max-w-max bg-slate-200 text-slate-900 shadow-lg">
              Completed
            </Badge>
          </div>
        )}

        {article.is_approved && systemPathRegex.test(pathName) && (
          <div className="flex justify-center">
            <Badge className="text-md relative -top-[11rem] right-0 left-0 m-auto max-w-max bg-slate-200 text-slate-900 shadow-lg">
              Approved
            </Badge>
          </div>
        )}
      </Link>
    );
  },
);

ArticleShowcaseCard.displayName = "ArticleShowcaseCard";

export default React.memo(ArticleShowcaseCard);
