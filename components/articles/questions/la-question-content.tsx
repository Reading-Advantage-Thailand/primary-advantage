"use client";
import { QuizContext } from "@/contexts/question-context";
import React, { useContext } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LAQuestion } from "@/types";
import { Button } from "@/components/ui/button";
import TextareaAutosize from "react-textarea-autosize";

export default function LAQuestionContent({ data }: { data: LAQuestion[] }) {
  const { timer, setPaused } = useContext(QuizContext);

  return (
    <CardContent className="flex flex-col gap-4">
      <div className="flex gap-2 items-end">
        <Badge className="flex-1 justify-start" variant="destructive">
          {timer} seconds elapsed
        </Badge>
      </div>
      <CardTitle className="font-bold text-3xl md:text-3xl">
        Long Answer Questions
      </CardTitle>
      <CardDescription className="text-2xl md:text-2xl">
        {data[0]?.question}
      </CardDescription>
      <TextareaAutosize
        autoFocus
        // disabled={isCompleted}
        placeholder="Type your answer here..."
        className="border-input resize-none focus:outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-transparent px-3 py-2 shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
        // {...register("answer")}
      />
      <div className="space-x-2">
        <Button variant="outline" size={"sm"}>
          {/* {t("cancelButton")} */}
          Cancel
        </Button>
        <Button
          type="submit"
          size={"sm"}
          //   disabled={isLoading}
          //   {...register("method")}
          //   onClick={() => {
          //     setOpenModal(false);
          //     setValue("method", "feedback");
          //   }}
        >
          Get Feedback
          {/* {isLoading && getValues("method") === "feedback" && (
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          )}
          {t("feedbackButton")} */}
        </Button>
        <Button
          type="submit"
          size={"sm"}
          // disabled={isLoading}
          // {...register("method")}
          // onClick={() => {
          //   setOpenModal(false);
          //   setValue("method", "submit");
          // }}
        >
          Submit
          {/* {isLoading && getValues("method") === "submit" && (
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            )}
            {t("submitButton")} */}
        </Button>
      </div>
    </CardContent>
  );
}
