import ArticleCard from "@/components/articles/article-card";
import LAQuestionCard from "@/components/articles/questions/la-question-card";
import MCQuestionCard from "@/components/articles/questions/mc-question-card";
import SAQuestionCard from "@/components/articles/questions/sa-question-card";
import WordList from "@/components/articles/word-list";
import { getArticleById } from "@/server/models/articleModel";
import React from "react";
import { Article, WordListTimestamp } from "@/types";
import Sentence, {
  Sentence as SentenceType,
} from "@/components/articles/sentence";
import { currentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { saveArticleToFlashcard } from "@/actions/flashcard";

export const metadata = {
  title: "Article",
  description: "Article",
};

type Params = Promise<{ articleId: string }>;

export default async function ArticleQuizPage({ params }: { params: Params }) {
  const user = await currentUser();

  if (!user) {
    return redirect("/auth/signin");
  }

  const { articleId } = await params;
  const { article } = await getArticleById(articleId);

  const isSaved = article.articleActivityLog.some(
    (activity) =>
      activity.userId === user.id && activity.isSentenceAndWordsSaved === true,
  );

  if (!isSaved) {
    if (
      article.articleActivityLog.some(
        (activity) =>
          activity.userId === user.id &&
          activity.isLongAnswerQuestionCompleted === true &&
          activity.isShortAnswerQuestionCompleted === true &&
          activity.isMultipleChoiceQuestionCompleted === true,
      )
    ) {
      await saveArticleToFlashcard(articleId, article.articleActivityLog[0].id);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-4 md:mb-5 md:flex md:flex-row md:gap-3">
        <ArticleCard
          article={
            article as unknown as Article & { articleActivityLog: any[] }
          }
        />
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
              words={article.sentencsAndWordsForFlashcard.flatMap(
                (word) => word.words as unknown as WordListTimestamp[],
              )}
              audioUrl={
                article.sentencsAndWordsForFlashcard[0].wordsUrl as string
              }
            />

            <Sentence
              sentences={article.sentencsAndWordsForFlashcard.flatMap(
                (sentence) => sentence.sentence as unknown as SentenceType[],
              )}
              audioUrl={
                article.sentencsAndWordsForFlashcard[0]
                  .audioSentencesUrl as string
              }
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
