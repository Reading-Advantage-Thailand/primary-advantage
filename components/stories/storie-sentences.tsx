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
import { SentenceFlashcard } from "@/types/story";
import { FlashcardSaveStatus } from "@/hooks/use-auto-save-flashcard";
import { useLocale, useTranslations } from "next-intl";
import AudioButton from "../audio-button";

interface StorieSentencesProps {
  sentences: SentenceFlashcard[];
  audioUrl?: string;
  saveStatus?: FlashcardSaveStatus;
}

interface Sentence {
  sentence: string;
  index?: number;
  translation?: Record<string, string> | null;
  timeSeconds?: number;
  audioUrl?: string;
  startTime?: number;
  endTime?: number;
}

export default function StorieSentences({
  sentences,
  audioUrl,
  saveStatus,
}: StorieSentencesProps) {
  const locale = useLocale();
  const [sentenceList, setSentenceList] = React.useState<Sentence[]>([]);
  const tCommon = useTranslations("common");

  useEffect(() => {
    if (sentences) {
      let sentencesList = [];

      sentencesList = sentences.map(
        (sentence: SentenceFlashcard, index: number) => {
          const startTime = sentence?.timeSeconds as number;
          const endTime =
            index === sentences.length - 1
              ? (sentence?.timeSeconds as number) + 10
              : (sentences[index + 1].timeSeconds as number);

          return {
            sentence: sentence?.sentence,
            translation: sentence?.translation,
            index,
            startTime,
            endTime,
            audioUrl,
          };
        },
      );
      setSentenceList(sentencesList);
    }
  }, [sentences, audioUrl]);

  return (
    <div>
      <Dialog modal={false}>
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Book className="h-4 w-4" />
            {tCommon("sentences")}
            {saveStatus?.isSaving && (
              <Loader2 className="h-3 w-3 animate-spin" />
            )}
            {saveStatus?.sentencesSaved && !saveStatus?.isSaving && (
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
            <DialogTitle>{tCommon("sentences")}</DialogTitle>
            <DialogDescription>
              {tCommon("sentencesdescriptionchapter")}
            </DialogDescription>
          </DialogHeader>
          <div>
            <div className="space-y-4">
              {sentenceList.length > 0 ? (
                sentenceList.map((sentence, i) => (
                  <div
                    key={i}
                    className="flex items-start space-x-4 rounded-lg border p-4"
                  >
                    <span className="text-muted-foreground text-semibold font-medium">
                      {i + 1}.
                    </span>
                    <div className="flex w-full items-center justify-between">
                      <div className="flex-col space-y-1">
                        <p className="text-semibold">{sentence.sentence}</p>
                        {sentence.translation && locale !== "en" && (
                          <p className="text-muted-foreground text-sm">
                            {
                              sentence.translation[
                                locale as keyof typeof sentence.translation
                              ]
                            }
                          </p>
                        )}
                      </div>
                      <AudioButton
                        audioUrl={sentence.audioUrl || ""}
                        startTimestamp={sentence.startTime || 0}
                        endTimestamp={sentence.endTime || 0}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center">
                  No sentences available for this chapter.
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
