import ArticleCard from "@/components/articles/article-card";
import LAQuestionCard from "@/components/articles/questions/la-question-card";
import MCQuestionCard from "@/components/articles/questions/mc-question-card";
import SAQuestionCard from "@/components/articles/questions/sa-question-card";
import WordList from "@/components/articles/word-list";
import { getArticleById } from "@/server/models/articleModel";
import React from "react";
import { Article, WordListTimestamp } from "@/types";

export const metadata = {
  title: "Article",
  description: "Article",
};

type Params = Promise<{ articleId: string }>;

export default async function ArticleQuizPage({ params }: { params: Params }) {
  const { articleId } = await params;
  const { article } = await getArticleById(articleId);

  return (
    <>
      <div className="flex flex-col gap-4 md:mb-5 md:flex md:flex-row md:gap-3">
        <ArticleCard article={article as unknown as Article} />
        <div className="flex flex-col items-start gap-4 md:basis-2/5">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:flex-nowrap">
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

            <WordList
              articleId={articleId}
              words={article.words as unknown as WordListTimestamp[]}
              audioUrl={article.audioWordUrl as string}
            />
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
