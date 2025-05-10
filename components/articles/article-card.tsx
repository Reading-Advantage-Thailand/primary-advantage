import React from "react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Image from "next/image";
import { Badge } from "../ui/badge";
import { Article } from "@/types";
import { AlertCircle } from "lucide-react";
import ArticleContent from "./article-content";
// import RatingPopup from "./rating-popup";

type Props = {
  article: Article;
  userId?: string;
};

export default async function ArticleCard({ article, userId }: Props) {
  return (
    <div className="md:basis-3/5">
      <Card>
        <CardHeader>
          <CardTitle className="font-article font-bold text-3xl md:text-5xl">
            {article.title}
          </CardTitle>
          <div className="flex flex-wrap gap-3">
            <Badge>RA Level : {article.raLevel}</Badge>
            <Badge>Cefr Level : {article.cefrLevel}</Badge>
          </div>
          <CardDescription className="font-article text-lg md:text-xl">
            {article.summary}
          </CardDescription>
          <div className="flex justify-center">
            <Image
              src={`/images/${article.id}.png`}
              // src={`https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/images/${articleId}.png`}
              alt="Malcolm X"
              width={640}
              height={640}
            />
          </div>
          <ArticleContent article={article} />
        </CardHeader>
        <footer>
          <div className="flex items-center gap-4 px-8">
            <AlertCircle width={64} height={64} />
            <p className="text-sm leading-loose">
              For language learners: This reading passage and its supporting
              visuals are designed for educational purposes. The
              computer-generated audio helps with pronunciation and listening
              practice. As with any learning resource, consider
              cross-referencing any facts used in academic work.
            </p>
          </div>
        </footer>
      </Card>
      {/* <RatingPopup
        userId={userId}
        averageRating={article.average_rating}
        articleId={articleId}
        article={article}
      /> */}
    </div>
  );
}
