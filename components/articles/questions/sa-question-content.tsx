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
import { SAQuestion } from "@/types";
import { Button } from "@/components/ui/button";
import TextareaAutosize from "react-textarea-autosize";

export default function SAQuestionContent({ data }: { data: SAQuestion[] }) {
  const { timer, setPaused } = useContext(QuizContext);

  return (
    <CardContent className="flex flex-col gap-4">
      <div className="flex gap-2 items-end">
        <Badge className="flex-1 justify-start" variant="destructive">
          {timer} seconds elapsed
        </Badge>
      </div>
      <CardTitle className="font-bold text-3xl md:text-3xl">
        Short Answer Questions
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
      <div>
        <Button variant={"outline"} size={"sm"} className="">
          Submit
        </Button>
      </div>

      {/* <Dialog>
          <DialogTrigger asChild>
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={isLoading}
            >
              {isLoading && (
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              )}
              {t("submitButton")}
            </Button>
          </DialogTrigger>
          {!isLoading && (
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader className="text-left">
                <DialogTitle className="font-bold text-2xl">
                  {t("scorerate")}
                </DialogTitle>
                <DialogDescription>
                  <p className="font-bold text-lg mt-4">{t("question")}</p>
                  <p>{resp.result.question}</p>
                  <p className="font-bold text-lg mt-4">
                    {t("suggestedAnswer")}
                  </p>
                  <p>{data.suggested_answer}</p>
                  <p className="font-bold text-lg mt-4">{t("yourAnswer")}</p>
                  <p className="text-green-500 dark:text-green-400 inline font-bold mt-2">
                    {data.answer}
                  </p>
                </DialogDescription>
              </DialogHeader>
              <div className="flex items-center justify-center">
                <Rating
                  sx={{
                    // change unselected color
                    "& .MuiRating-iconEmpty": {
                      color: "#f6a904",
                    },
                  }}
                  name="simple-controlled"
                  value={rating}
                  onChange={(event, newValue) => {
                    setRating(newValue ? newValue : 0);
                  }}
                  size="large"
                />
              </div>
              <DialogFooter>
                <Button
                  disabled={isLoading}
                  onClick={() => {
                    setIsCompleted(true);
                    onRating();
                  }}
                >
                  {t("rateButton")}
                </Button>
              </DialogFooter>
            </DialogContent>
          )}
        </Dialog> */}
    </CardContent>
  );
}
