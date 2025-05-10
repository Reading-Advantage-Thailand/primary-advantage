import ArticleCard from "@/components/articles/article-card";
import LAQuestionCard from "@/components/articles/questions/la-question-card";
import MCQuestionCard from "@/components/articles/questions/mc-question-card";
import SAQuestionCard from "@/components/articles/questions/sa-question-card";
import WordList from "@/components/articles/word-list";
import { getArticleWithId } from "@/server/models/articles";
import React from "react";

export const metadata = {
  title: "Article",
  description: "Article",
};

type Params = Promise<{ articleId: string }>;

export default async function ArticleQuizPage({ params }: { params: Params }) {
  const { articleId } = await params;
  const articleResponse = await getArticleWithId(articleId);

  // if (!articleResponse) return <CustomError />;

  return (
    <>
      <div className="flex flex-col gap-4 md:flex md:flex-row md:gap-3 md:mb-5">
        <ArticleCard article={articleResponse.article} />
        <div className="flex flex-col items-start gap-4 md:basis-2/5">
          <div className="flex gap-2 justify-center items-center sm:flex-nowrap flex-wrap">
            {/* {isAtLeastTeacher(user.role) && (
              <>
                <PrintArticle
                  articleId={params.articleId}
                  article={articleResponse.article}
                />
              </>
            )}
            {isAboveTeacher(user.role) && (
              <ArticleActions
                article={articleResponse.article}
                articleId={params.articleId}
              />
            )} */}

            <WordList />
          </div>

          <MCQuestionCard articleId={articleId} />
          <SAQuestionCard articleId={articleId} />
          <LAQuestionCard articleId={articleId} />
        </div>
      </div>
      {/* <ChatBotFloatingChatButton
        article={articleResponse?.article as Article}
      /> */}
    </>
  );
}
