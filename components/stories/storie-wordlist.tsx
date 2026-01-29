import React, { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Book, Check, Loader2 } from "lucide-react";
import { WordFlashcard } from "@/types/story";
import { FlashcardSaveStatus } from "@/hooks/use-auto-save-flashcard";
import { useLocale, useTranslations } from "next-intl";
import AudioButton from "../audio-button";

interface StorieWordlistProps {
  words: WordFlashcard[];
  audioUrl?: string;
  saveStatus?: FlashcardSaveStatus;
}

interface WordList {
  vocabulary: string;
  definition?: Record<string, string> | null;
  startTime: number;
  endTime: number;
  audioUrl?: string;
}

export default function StorieWordlist({
  words,
  audioUrl,
  saveStatus,
}: StorieWordlistProps) {
  const locale = useLocale();
  const [wordList, setWordList] = React.useState<WordList[]>([]);
  const tCommon = useTranslations("common");

  useEffect(() => {
    if (words) {
      let wordList = [];

      wordList = words.map((word: WordFlashcard, index: number) => {
        const startTime = word?.timeSeconds as number;
        const endTime =
          index === words.length - 1
            ? (word?.timeSeconds as number) + 10
            : (words[index + 1].timeSeconds as number);

        return {
          vocabulary: word?.vocabulary,
          definition: word?.definition,
          index,
          startTime,
          endTime,
          audioUrl,
        };
      });
      setWordList(wordList);
    }
  }, [words, audioUrl]);

  return (
    <div>
      <Dialog modal={false}>
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Book className="h-4 w-4" />
            {tCommon("wordlist")}
            {saveStatus?.isSaving && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            {saveStatus?.wordsSaved && !saveStatus?.isSaving && (
              <Badge
                variant="secondary"
                className="ml-1 bg-green-100 px-1.5 py-0 text-xs text-green-700"
              >
                <Check className="mr-0.5 h-3 w-3" />
                {tCommon("saved")}
              </Badge>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{tCommon("wordlist")}</DialogTitle>
            <DialogDescription>
              {tCommon("wordlistdescriptionchapter")}
            </DialogDescription>
          </DialogHeader>
          <div>
            <div className="space-y-4">
              {wordList.length > 0 ? (
                wordList.map((word, i) => (
                  <div
                    key={i}
                    className="flex items-start space-x-4 rounded-lg border p-4"
                  >
                    <span className="text-muted-foreground text-semibold font-medium">
                      {i + 1}.
                    </span>
                    <div className="flex w-full items-center justify-between">
                      <div className="flex-col space-y-1">
                        <p className="font-semibold capitalize">
                          {word.vocabulary}
                        </p>
                        {word.definition && (
                          <p className="text-muted-foreground text-sm">
                            {
                              word.definition[
                                locale as keyof typeof word.definition
                              ]
                            }
                          </p>
                        )}
                      </div>

                      <AudioButton
                        audioUrl={word.audioUrl || ""}
                        startTimestamp={word.startTime || 0}
                        endTimestamp={word.endTime || 0}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center">
                  No words available for this chapter.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button>{tCommon("close")}</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
