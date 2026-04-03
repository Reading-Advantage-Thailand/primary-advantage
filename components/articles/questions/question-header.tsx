"use client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import React from "react";
import { useStartArticleQuiz } from "@/hooks/use-article-quiz";

type Props = {
  children: React.ReactNode;
  heading: string;
  description: string;
  buttonLabel: string;
  className?: string;
  disabled?: boolean;
  articleId: string;
  activityType: string;
};

export default function QuestionHeader({
  children,
  heading,
  description,
  buttonLabel,
  disabled = true,
  articleId,
  activityType,
}: Props) {
  const [isButtonClicked, setIsButtonClicked] = React.useState<boolean>(false);
  const { startQuiz } = useStartArticleQuiz();

  function onButtonClick() {
    setIsButtonClicked(true);
    startQuiz({ articleId, activityType });
  }

  return isButtonClicked ? (
    <>{children}</>
  ) : (
    <>
      <CardHeader>
        <CardTitle className="text-3xl font-bold md:text-3xl">
          {heading}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={onButtonClick} disabled={disabled}>
          {buttonLabel}
        </Button>
      </CardContent>
    </>
  );
}
