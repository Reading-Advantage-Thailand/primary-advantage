"use client";
import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
// import { createEmptyCard, Card } from "ts-fsrs";
// import {
//   ContextMenu,
//   ContextMenuContent,
//   ContextMenuItem,
//   ContextMenuTrigger,
// } from "./ui/context-menu";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from "./ui/alert-dialog";
import { Article } from "@/types";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "../ui/context-menu";

type Props = {
  article: Article;
};

type Sentence = {
  sentence: string;
  index: number;
  startTime: number;
  endTime: number;
  audioUrl: string;
};

async function getTranslateSentence(
  articleId: string,
  targetLanguage: string
): Promise<{ message: string; translated_sentences: string[] }> {
  try {
    const res = await fetch(`/api/v1/assistant/translate/${articleId}`, {
      method: "POST",
      body: JSON.stringify({ type: "passage", targetLanguage }),
    });
    const data = await res.json();
    return data;
  } catch (error) {
    return { message: "error", translated_sentences: [] };
  }
}

export default function ArticleContent({ article }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentAudioIndex, setCurrentAudioIndex] = useState(0);
  const [togglePlayer, setTogglePlayer] = useState<Boolean>(false);
  const [selectedSentence, setSelectedSentence] = React.useState<Number>(-1);
  const [loading, setLoading] = React.useState(false);
  const [translate, setTranslate] = React.useState<string[]>([]);
  const [isTranslate, setIsTranslate] = React.useState(false);
  const [isTranslateOpen, setIsTranslateOpen] = React.useState(false);
  const [isTranslateClicked, setIsTranslateClicked] = React.useState(false);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  const [speed, setSpeed] = useState<string>("1");

  const sentenceList: Sentence[] = article.timepoints.map(
    (timepoint, index) => {
      const startTime = timepoint.timeSeconds;
      const endTime =
        index === article.timepoints.length - 1
          ? timepoint.timeSeconds + 10
          : article.timepoints[index + 1].timeSeconds - 0.3;
      // const sentence =
      //   sentences.length <= article.timepoints.length
      //     ? article.timepoints[index].sentences
      //     : sentences[index];
      return {
        sentence: article.timepoints[index].sentences,
        index: timepoint.index,
        startTime,
        endTime,
        audioUrl: timepoint.file
          ? `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/tts/${timepoint.file}`
          : `https://storage.googleapis.com/artifacts.reading-advantage.appspot.com/tts/${article.id}.mp3`,
      };
    }
  );

  const handlePlayPause = async () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        try {
          await audioRef.current.play();
        } catch (error) {
          console.log("Error playing audio: ", error);
        }
      }
      setIsPlaying(!isPlaying);
    }
  };

  //   const handleTimeUpdate = () => {
  //     if (audioRef.current) {
  //       setCurrentTime(audioRef.current.currentTime);
  //       const currentSentence = sentenceList[currentAudioIndex];
  //       if (audioRef.current.currentTime >= currentSentence.endTime) {
  //         handleAudioEnded();
  //       }
  //     }
  //   };

  //   const handleSentenceClick = (startTime: number, audioIndex: number) => {
  //     if (audioRef.current && togglePlayer) {
  //       audioRef.current.pause();
  //       setCurrentAudioIndex(audioIndex);
  //       audioRef.current.src = sentenceList[audioIndex].audioUrl;
  //       audioRef.current.currentTime = startTime;
  //       const playAudio = () => {
  //         audioRef.current!.play().catch((error) => {
  //           console.log("Error playing audio: ", error);
  //         });
  //         audioRef.current!.removeEventListener("canplaythrough", playAudio);
  //       };
  //       audioRef.current.addEventListener("canplaythrough", playAudio);
  //       audioRef.current.load();
  //       if (!isPlaying) {
  //         setIsPlaying(true);
  //       }
  //     }
  //   };

  //   const handleAudioEnded = () => {
  //     if (currentAudioIndex < sentenceList.length - 1) {
  //       const nextAudioIndex = currentAudioIndex + 1;
  //       setCurrentAudioIndex(nextAudioIndex);
  //       if (audioRef.current) {
  //         audioRef.current.src = sentenceList[nextAudioIndex].audioUrl;
  //         audioRef.current.load();
  //         const playAudio = () => {
  //           audioRef.current!.currentTime =
  //             sentenceList[nextAudioIndex].startTime;
  //           audioRef.current!.play().catch((error) => {
  //             console.log("Error playing audio: ", error);
  //           });
  //           audioRef.current!.removeEventListener("canplaythrough", playAudio);
  //         };
  //         audioRef.current.addEventListener("canplaythrough", playAudio);
  //       }
  //     } else {
  //       setIsPlaying(false);
  //       setCurrentAudioIndex(0);
  //     }
  //   };

  const getHighlightedClass = (index: number) =>
    cn(
      "cursor-pointer text-muted-foreground hover:bg-blue-200 hover:dark:bg-blue-900 hover:text-primary rounded-md",
      currentAudioIndex === index &&
        isPlaying &&
        "bg-red-200 dark:bg-red-900 text-primary"
    );

  const renderSentence = (sentence: string, i: number) => {
    // if (!sentence) {
    //   return "";
    // }

    return sentence.split("~~").map((line, index, array) => (
      <span
        key={index}
        onClick={() => {
          setSelectedSentence(i);
          setSelectedIndex(i);
        }}
      >
        {line}
        {(index !== array.length - 1 || /[.!?]$/.test(line)) && " "}
        {index !== array.length - 1 && <div className="mt-3" />}
      </span>
    ));
  };

  const handleTogglePlayer = () => {
    if (togglePlayer) {
      setTogglePlayer(false);
      audioRef.current?.load();
      setIsPlaying(false);
      setCurrentAudioIndex(0);
      setSpeed("1");
    } else {
      setTogglePlayer(true);
    }
  };

  //   const saveToFlashcard = async () => {
  //     //translate before save
  //     if (!isTranslate) {
  //       await handleTranslate();
  //     } else {
  //       try {
  //         let card: Card = createEmptyCard();
  //         let endTimepoint = 0;
  //         if (selectedSentence !== -1) {
  //           endTimepoint = sentenceList[selectedSentence as number].endTime;
  //         } else {
  //           endTimepoint = audioRef.current?.duration as number;
  //         }

  //         const resSaveSentences = await fetch(
  //           `/api/v1/users/sentences/${userId}`,
  //           {
  //             method: "POST",
  //             body: JSON.stringify({
  //               sentence: sentenceList[
  //                 selectedSentence as number
  //               ].sentence.replace("~~", ""),
  //               sn: selectedSentence,
  //               articleId: article.id,
  //               translation: {
  //                 th: translate[selectedSentence as number],
  //               },
  //               audioUrl: sentenceList[selectedSentence as number].audioUrl,
  //               timepoint: sentenceList[selectedSentence as number].startTime,
  //               endTimepoint: endTimepoint,
  //               saveToFlashcard: true, // case ประโยคที่เลือกจะ save to flashcard
  //               ...card,
  //             }),
  //           }
  //         );

  //         if (resSaveSentences.status === 200) {
  //           toast({
  //             title: "Success",
  //             description: `You have saved "${sentenceList[
  //               selectedSentence as number
  //             ].sentence.replace("~~", "")}" to flashcard`,
  //           });
  //         } else if (resSaveSentences.status === 400) {
  //           toast({
  //             title: "Sentence already saved",
  //             description: "You have already saved this sentence.",
  //             variant: "destructive",
  //           });
  //         }
  //       } catch (error) {
  //         console.error("Error:", error);
  //         toast({
  //           title: "Something went wrong.",
  //           description: "Your sentence was not saved. Please try again.",
  //           variant: "destructive",
  //         });
  //       }
  //     }
  //   };

  //   async function handleTranslateSentence() {
  //     setLoading(true);
  //     type ExtendedLocale = "th" | "cn" | "tw" | "vi" | "zh-CN" | "zh-TW";
  //     let targetLanguage: ExtendedLocale = locale as ExtendedLocale;
  //     switch (locale) {
  //       case "cn":
  //         targetLanguage = "zh-CN";
  //         break;
  //       case "tw":
  //         targetLanguage = "zh-TW";
  //         break;
  //     }
  //     const response = await getTranslateSentence(article.id, targetLanguage);
  //     if (response.message === "error") {
  //       setIsTranslate(false);
  //       setIsTranslateOpen(false);
  //       setLoading(false);
  //       toast({
  //         title: "Something went wrong.",
  //         description: "Your sentence was not translated. Please try again.",
  //         variant: "destructive",
  //       });
  //       return;
  //     } else {
  //       setTranslate(response.translated_sentences);
  //       setIsTranslateOpen(!isTranslateOpen);
  //       setIsTranslate(true);
  //       setLoading(false);
  //     }
  //   }

  const handleSpeedTime = (value: string) => {
    setSpeed(value);
  };

  //   const handleNextTrack = () => {
  //     if (isPlaying) {
  //       if (currentAudioIndex < sentenceList.length - 1) {
  //         const nextAudioIndex = currentAudioIndex + 1;
  //         setCurrentAudioIndex(nextAudioIndex);
  //         if (audioRef.current) {
  //           audioRef.current.src = sentenceList[nextAudioIndex].audioUrl;
  //           audioRef.current.load();
  //           const playAudio = () => {
  //             audioRef.current!.currentTime =
  //               sentenceList[nextAudioIndex].startTime;
  //             audioRef.current!.play().catch((error) => {
  //               console.log("Error playing audio: ", error);
  //             });
  //             audioRef.current!.removeEventListener("canplaythrough", playAudio);
  //           };
  //           audioRef.current.addEventListener("canplaythrough", playAudio);
  //         }
  //       } else {
  //         setIsPlaying(false);
  //       }
  //     }
  //   };

  //   const handlePreviousTrack = () => {
  //     if (isPlaying) {
  //       if (currentAudioIndex > 0) {
  //         const prevAudioIndex = currentAudioIndex - 1;
  //         setCurrentAudioIndex(prevAudioIndex);
  //         if (audioRef.current) {
  //           audioRef.current.src = sentenceList[prevAudioIndex].audioUrl;
  //           audioRef.current.load();
  //           const playAudio = () => {
  //             audioRef.current!.currentTime =
  //               sentenceList[prevAudioIndex].startTime;
  //             audioRef.current!.play().catch((error) => {
  //               console.log("Error playing audio: ", error);
  //             });
  //             audioRef.current!.removeEventListener("canplaythrough", playAudio);
  //           };
  //           audioRef.current.addEventListener("canplaythrough", playAudio);
  //         }
  //       } else {
  //         setCurrentAudioIndex(0);
  //         setSelectedIndex(-1);
  //         if (audioRef.current) {
  //           audioRef.current.src = sentenceList[currentAudioIndex].audioUrl;
  //           audioRef.current.load();

  //           const playAudio = () => {
  //             audioRef.current!.currentTime =
  //               sentenceList[currentAudioIndex].startTime;
  //             audioRef.current!.play().catch((error) => {
  //               console.log("Error playing audio: ", error);
  //             });
  //             audioRef.current!.removeEventListener("canplaythrough", playAudio);
  //           };

  //           audioRef.current.addEventListener("canplaythrough", playAudio);
  //         }
  //       }
  //     }
  //   };

  //   const handleTranslate = async () => {
  //     //if not translate, translate
  //     if (isTranslate === false) {
  //       await handleTranslateSentence();
  //       setIsTranslateClicked(!isTranslateClicked);
  //     } else {
  //       console.log("isTranslate", isTranslate);
  //       //if translate, set isTranslate to false
  //       setIsTranslateClicked(!isTranslateClicked);
  //     }
  //   };

  //   useEffect(() => {
  //     const audio = audioRef.current;
  //     setSelectedIndex(-1);
  //     if (audio) {
  //       audio.src = sentenceList[currentAudioIndex].audioUrl;

  //       audio.load();
  //       const handleLoadedMetadata = () => {
  //         audio.currentTime = sentenceList[currentAudioIndex].startTime;

  //         audio.playbackRate = Number(speed);

  //         if (isPlaying) {
  //           audio.play().catch((error) => {
  //             // Handle any errors (e.g., user interaction required)
  //             console.error("Playback error:", error);
  //           });
  //         }
  //       };

  //       audio.addEventListener("loadedmetadata", handleLoadedMetadata);

  //       return () => {
  //         audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
  //         audio.pause();
  //       };
  //     }
  //   }, [currentAudioIndex, speed]);

  return (
    <div>
      <div className="flex justify-center items-center my-2 gap-4">
        <div id="onborda-audio" className="flex flex-grow items-center">
          <Button
            variant="default"
            className="w-full"
            onClick={handleTogglePlayer}
          >
            {/* {t("openvoicebutton")} */}
          </Button>
        </div>
        <div id="onborda-translate">
          <Button
            variant="default"
            // onClick={handleTranslateSentence}
            disabled={loading}
          >
            {/* {loading
              ? "Loading"
              : isTranslate && isTranslateOpen
              ? t("translateButton.close")
              : t("translateButton.open")} */}
          </Button>
        </div>
      </div>
      {togglePlayer && (
        <div
          id="audioPlayer"
          className="p-4 rounded my-2 bg-primary text-primary-foreground"
        >
          <div className="flex justify-between items-center gap-2">
            <Button
              variant="secondary"
              className="rounded-full w-10 h-10 p-0"
              //   onClick={handlePreviousTrack}
            >
              {/* <TrackPreviousIcon /> */}
            </Button>
            <Button
              id="playPauseButton"
              variant="secondary"
              className="rounded-full w-10 h-10 p-0"
              onClick={handlePlayPause}
            >
              {/* {isPlaying ? <PauseIcon /> : <PlayIcon />} */}
            </Button>
            <Button
              variant="secondary"
              className="rounded-full w-10 h-10 p-0"
              //   onClick={handleNextTrack}
            >
              {/* <TrackNextIcon /> */}
            </Button>
            <div>
              <Select defaultValue="1" onValueChange={handleSpeedTime}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                  <SelectItem value="0.5">0.5x</SelectItem>
                  <SelectItem value="0.75">0.75x</SelectItem>
                  <SelectItem value="1">1x</SelectItem>
                  <SelectItem value="1.25">1.25x</SelectItem>
                  <SelectItem value="1.5">1.5x</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* show ที่แปลภาษาทีละประโยค */}
      {isTranslate && isTranslateOpen && (
        <div className="h-32 md:h-24 flex flex-col justify-between items-center">
          <Separator />
          {/* กรณีกดเล่นเสียง และกดแปล */}
          {isPlaying === true ? (
            <p className="text-center text-green-500">
              {translate[currentAudioIndex]}
            </p>
          ) : (
            <p className="text-center text-green-500">
              {translate[selectedIndex]}
            </p>
          )}
          <Separator />
        </div>
      )}
      <ContextMenu>
        <ContextMenuTrigger>
          {sentenceList.map((sentence, index) => (
            <span
              id="onborda-savesentences"
              key={sentence.index}
              className={cn(
                selectedIndex === index && "bg-blue-200 dark:bg-blue-900",
                `${getHighlightedClass(index)}`,
                "font-article text-lg md:text-xl"
              )}
              //   onClick={() => {
              //     handleSentenceClick(sentence.startTime, index);
              //     console.log(sentence);
              //   }}
            >
              {renderSentence(sentence.sentence, index)}
            </span>
          ))}
          {/* <audio
            ref={audioRef}
            onTimeUpdate={handleTimeUpdate}
            onEnded={handleAudioEnded}
          >
            <source src={sentenceList[currentAudioIndex].audioUrl} />
          </audio> */}
        </ContextMenuTrigger>
        <ContextMenuContent className="w-64">
          {loading ? (
            <ContextMenuItem inset disabled>
              Loading
            </ContextMenuItem>
          ) : (
            <>
              <ContextMenuItem
                inset
                // onClick={() => {
                //   saveToFlashcard();
                // }}
                disabled={loading}
              >
                Save to flashcard
              </ContextMenuItem>
              <ContextMenuItem
                inset
                // onClick={handleTranslate}
                disabled={loading}
              >
                Translate
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
      {/* <AlertDialog open={isTranslateClicked}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Translate</AlertDialogTitle>
            <AlertDialogDescription>
              <p>
                {selectedSentence !== -1
                  ? sentenceList[selectedSentence as number].sentence.replace(
                      "~~",
                      ""
                    )
                  : ""}
              </p>
              <p className="text-green-500 mt-3">{translate[selectedIndex]}</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setIsTranslateClicked(false)}>
              Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog> */}
    </div>
  );
}
