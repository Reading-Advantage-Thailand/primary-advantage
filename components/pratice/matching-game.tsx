"use client";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Header } from "../header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  RotateCcw,
  CheckCircle,
  XCircle,
  Trophy,
  Shuffle,
  Play,
  Clock,
  Target,
  Zap,
  Loader2,
  Languages,
  Volume2,
  Lightbulb,
  Eye,
  EyeOff,
  Link,
  CornerDownRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface MatchingPair {
  id: string;
  left: {
    id: string;
    content: string;
    type: "word" | "phrase" | "sentence";
  };
  right: {
    id: string;
    content: string;
    type: "definition" | "translation" | "meaning";
  };
  articleId: string;
  articleTitle: string;
  audioUrl?: string;
  startTime?: number;
  endTime?: number;
}

interface MatchingGameData {
  id: string;
  pairs: MatchingPair[];
  difficulty: "easy" | "medium" | "hard";
}

interface MatchingGameProps {
  deckId?: string;
  gameData?: MatchingGameData[];
}

interface UserMatch {
  leftId: string;
  rightId: string;
  isCorrect: boolean;
}

export function MatchingGame({ deckId, gameData = [] }: MatchingGameProps) {
  // ALL HOOKS MUST BE DECLARED AT THE TOP LEVEL - NO CONDITIONAL HOOKS
  const router = useRouter();

  // State hooks - always called in the same order
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userMatches, setUserMatches] = useState<UserMatch[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [timer, setTimer] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDifficulty, setSelectedDifficulty] = useState<
    "easy" | "medium" | "hard"
  >("medium");
  const [selectedLeft, setSelectedLeft] = useState<string | null>(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [hintsEnabled, setHintsEnabled] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  const [rawGameData, setRawGameData] = useState<MatchingGameData[]>([]);
  const [activeGameData, setActiveGameData] =
    useState<MatchingGameData[]>(gameData);
  const [audioHintsEnabled, setAudioHintsEnabled] = useState(false);

  // Callback hooks - always called in the same order
  const generatePairsForGame = useCallback(
    (
      gameData: MatchingGameData[],
      difficulty: "easy" | "medium" | "hard",
    ): MatchingGameData[] => {
      const pairCount =
        difficulty === "easy" ? 4 : difficulty === "medium" ? 6 : 8;

      return gameData.map((game) => {
        const shuffledPairs = [...game.pairs].sort(() => Math.random() - 0.5);
        const selectedPairs = shuffledPairs.slice(
          0,
          Math.min(pairCount, game.pairs.length),
        );

        return {
          ...game,
          pairs: selectedPairs,
          difficulty,
        };
      });
    },
    [],
  );

  const handlePairSelect = useCallback(
    (leftId: string, rightId: string) => {
      if (isCompleted) return;

      const correctPair = activeGameData[currentIndex]?.pairs.find(
        (pair) => pair.left.id === leftId,
      );
      if (!correctPair) return;

      const isCorrect = rightId === correctPair.right.id;

      const newMatch: UserMatch = {
        leftId,
        rightId,
        isCorrect,
      };

      setUserMatches((prev) => {
        const existing = prev.find((m) => m.leftId === leftId);
        if (existing) {
          return prev.map((m) => (m.leftId === leftId ? newMatch : m));
        } else {
          return [...prev, newMatch];
        }
      });

      setHasUserInteracted(true);
      setSelectedLeft(null);

      if (isCorrect) {
        toast.success("Correct match! ✅");
      } else {
        toast.error("Incorrect match. Try again! ❌");
      }
    },
    [activeGameData, currentIndex, isCompleted],
  );

  const handleLeftItemClick = useCallback(
    (leftId: string) => {
      if (isCompleted) return;
      setSelectedLeft((prev) => (prev === leftId ? null : leftId));
    },
    [isCompleted],
  );

  const handleRightItemClick = useCallback(
    (rightId: string) => {
      if (isCompleted || !selectedLeft) return;
      handlePairSelect(selectedLeft, rightId);
    },
    [selectedLeft, isCompleted, handlePairSelect],
  );

  const loadGameDataFromDeck = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/flashcard/decks/${deckId}/sentences-for-matching`,
      );
      if (response.ok) {
        const data = await response.json();
        setRawGameData(data.matchingGames || []);
      } else {
        toast.error("Failed to load matching data from flashcard deck");
      }
    } catch (error) {
      console.error("Error loading matching data:", error);
      toast.error("Failed to load matching data");
    } finally {
      setIsLoading(false);
    }
  }, [deckId]);

  const handleStartGame = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < activeGameData.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setGameComplete(true);
      setIsPlaying(false);
    }
  }, [currentIndex, activeGameData.length]);

  const handleRestart = useCallback(() => {
    setUserMatches([]);
    setShowResult(false);
    setIsCompleted(false);
    setHasUserInteracted(false);
    setShowCorrectAnswers(false);
    setSelectedLeft(null);
    setHintsEnabled(false);
  }, []);

  const handleCheckAnswer = useCallback(() => {
    const currentGame = activeGameData[currentIndex];
    if (!currentGame || userMatches.length === 0) return;

    const correctCount = userMatches.filter((match) => match.isCorrect).length;
    const isAllCorrect = correctCount === currentGame.pairs.length;

    setIsCompleted(true);
    setShowResult(true);
    setHasUserInteracted(true);

    if (isAllCorrect) {
      setScore((prev) => prev + 1);
      toast.success("Perfect! All pairs matched correctly! 🎉");
    } else {
      toast.error(
        `${correctCount}/${currentGame.pairs.length} correct. Try again! 💪`,
      );
    }
  }, [userMatches, activeGameData, currentIndex]);

  const handleRestartGame = useCallback(() => {
    setCurrentIndex(0);
    setScore(0);
    setTimer(0);
    setGameComplete(false);
    setIsPlaying(false);
    setHasUserInteracted(false);
  }, []);

  const handleShowAnswers = useCallback(() => {
    setShowCorrectAnswers(true);
    toast.info("Correct matches revealed! 📖");
  }, []);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const playAudio = useCallback(async () => {
    const currentGame = activeGameData[currentIndex];
    const currentPair = currentGame?.pairs.find(
      (pair) => selectedLeft && pair.left.id === selectedLeft,
    );

    if (!currentPair?.audioUrl || isPlayingAudio) return;

    setIsPlayingAudio(true);
    toast.success("Playing audio hint 🔊");

    try {
      await new Promise((resolve, reject) => {
        const audio = new Audio();
        let timeoutId: NodeJS.Timeout;

        const cleanup = () => {
          audio.pause();
          if (timeoutId) clearTimeout(timeoutId);
          audio.removeEventListener("loadeddata", handleLoadedData);
          audio.removeEventListener("seeked", handleSeeked);
          audio.removeEventListener("timeupdate", handleTimeUpdate);
          audio.removeEventListener("ended", handleEnded);
          audio.removeEventListener("error", handleError);
        };

        const handleLoadedData = () => {
          audio.removeEventListener("loadeddata", handleLoadedData);
          if (currentPair.startTime !== undefined) {
            audio.currentTime = currentPair.startTime;
          } else {
            audio.play().catch(handleError);
          }
        };

        const handleSeeked = () => {
          audio.removeEventListener("seeked", handleSeeked);
          audio
            .play()
            .then(() => {
              if (currentPair.endTime !== undefined) {
                audio.addEventListener("timeupdate", handleTimeUpdate);
              }
            })
            .catch(handleError);
        };

        const handleTimeUpdate = () => {
          if (
            currentPair.endTime !== undefined &&
            audio.currentTime >= currentPair.endTime
          ) {
            cleanup();
            resolve(void 0);
          }
        };

        const handleEnded = () => {
          cleanup();
          resolve(void 0);
        };

        const handleError = (error: any) => {
          cleanup();
          reject(error);
        };

        audio.addEventListener("loadeddata", handleLoadedData);
        if (currentPair.startTime !== undefined) {
          audio.addEventListener("seeked", handleSeeked);
        }
        audio.addEventListener("ended", handleEnded);
        audio.addEventListener("error", handleError);

        timeoutId = setTimeout(() => {
          cleanup();
          resolve(void 0);
        }, 10000);

        audio.preload = "auto";
        audio.src = currentPair.audioUrl!;
        audio.load();
      });

      toast.success("Audio completed! 🎵");
    } catch (error) {
      console.error("Error playing audio:", error);
      toast.error("Failed to play audio");
    } finally {
      setIsPlayingAudio(false);
    }
  }, [activeGameData, currentIndex, selectedLeft, isPlayingAudio]);

  const toggleHints = useCallback(() => {
    setHintsEnabled((prev) => {
      const newState = !prev;
      if (newState) {
        toast.success(
          "Hints enabled! 💡\n• Incorrect matches will be highlighted\n• Select an item to hear audio",
        );
      } else {
        toast.info("Hints disabled");
      }
      return newState;
    });
  }, []);

  const toggleAudioHints = useCallback(() => {
    setAudioHintsEnabled((prev) => !prev);
  }, []);

  const getMatchStatus = useCallback(
    (leftId: string, rightId: string) => {
      const match = userMatches.find(
        (m) => m.leftId === leftId && m.rightId === rightId,
      );
      return match;
    },
    [userMatches],
  );

  // Memo hooks - always called in the same order
  const activeGameDataWithPairs = useMemo(() => {
    if (rawGameData.length === 0) return [];
    return generatePairsForGame(rawGameData, selectedDifficulty);
  }, [rawGameData, selectedDifficulty, generatePairsForGame]);

  const currentGame = useMemo(
    () => activeGameData[currentIndex],
    [activeGameData, currentIndex],
  );

  const progress = useMemo(
    () =>
      ((currentIndex + (isCompleted ? 1 : 0)) / activeGameData.length) * 100,
    [currentIndex, isCompleted, activeGameData.length],
  );

  const shuffledRightItems = useMemo(() => {
    if (!currentGame) return [];
    return [...currentGame.pairs.map((pair) => pair.right)].sort(
      () => Math.random() - 0.5,
    );
  }, [currentGame?.pairs]);

  // Effect hooks - always called in the same order
  useEffect(() => {
    setActiveGameData(activeGameDataWithPairs);
    if (activeGameDataWithPairs.length > 0) {
      setCurrentIndex(0);
      setUserMatches([]);
      setShowResult(false);
      setIsCompleted(false);
      setHasUserInteracted(false);
      setShowCorrectAnswers(false);
      setSelectedLeft(null);
    }
  }, [activeGameDataWithPairs]);

  useEffect(() => {
    if (deckId && gameData.length === 0 && rawGameData.length === 0) {
      loadGameDataFromDeck();
    }
  }, [deckId, gameData.length, rawGameData.length, loadGameDataFromDeck]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && !gameComplete) {
      interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, gameComplete]);

  useEffect(() => {
    if (currentGame) {
      setUserMatches([]);
      setShowResult(false);
      setIsCompleted(false);
      setHasUserInteracted(false);
      setShowCorrectAnswers(false);
      setSelectedLeft(null);
    }
  }, [currentGame?.id]);

  useEffect(() => {
    if (!currentGame || userMatches.length === 0) return;

    if (
      userMatches.length === currentGame.pairs.length &&
      !isCompleted &&
      hasUserInteracted
    ) {
      const correctCount = userMatches.filter(
        (match) => match.isCorrect,
      ).length;
      const isAllCorrect = correctCount === currentGame.pairs.length;

      setIsCompleted(true);
      setShowResult(true);

      if (isAllCorrect) {
        setScore((prev) => prev + 1);
        toast.success("Perfect! All pairs matched correctly! 🎉");
      } else {
        toast.error(
          `${correctCount}/${currentGame.pairs.length} correct. Try again! 💪`,
        );
      }
    }
  }, [userMatches, currentGame?.pairs.length, isCompleted, hasUserInteracted]);

  // NOW ALL HOOKS ARE DECLARED - SAFE TO HAVE CONDITIONAL RENDERS

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">
              Loading your matching pairs...
            </h3>
            <p className="text-muted-foreground text-sm">
              Generating matches from your flashcard deck
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Game complete screen
  if (gameComplete) {
    const accuracy = Math.round((score / activeGameData.length) * 100);

    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-8 text-center">
          <div className="relative">
            <div className="animate-bounce">
              <Trophy className="mx-auto h-24 w-24 text-yellow-500" />
            </div>
            <div className="bg-primary absolute -top-2 -right-2 h-6 w-6 animate-ping rounded-full" />
          </div>

          <div className="space-y-4">
            <h1 className="gradient-text text-4xl font-bold md:text-5xl">
              🎉 Excellent Work!
            </h1>
            <p className="text-muted-foreground text-xl">
              You completed {activeGameData.length} matching challenges
            </p>
          </div>

          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-6 md:grid-cols-3">
            <Card className="relative overflow-hidden">
              <CardContent className="p-6 text-center">
                <Target className="mx-auto mb-3 h-8 w-8 text-blue-500" />
                <div className="text-3xl font-bold text-blue-600">{score}</div>
                <p className="text-muted-foreground text-sm">Perfect Scores</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardContent className="p-6 text-center">
                <Zap className="mx-auto mb-3 h-8 w-8 text-green-500" />
                <div className="text-3xl font-bold text-green-600">
                  {accuracy}%
                </div>
                <p className="text-muted-foreground text-sm">Accuracy</p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden">
              <CardContent className="p-6 text-center">
                <Clock className="mx-auto mb-3 h-8 w-8 text-purple-500" />
                <div className="text-3xl font-bold text-purple-600">
                  {formatTime(timer)}
                </div>
                <p className="text-muted-foreground text-sm">Total Time</p>
              </CardContent>
            </Card>
          </div>

          <div className="mx-auto flex max-w-md flex-col gap-4 sm:flex-row">
            <Button
              onClick={handleBack}
              size="lg"
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Menu
            </Button>
            <Button onClick={handleRestartGame} size="lg" className="flex-1">
              <RotateCcw className="mr-2 h-4 w-4" />
              Play Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Start screen
  if (!isPlaying) {
    return (
      <div className="container mx-auto max-w-4xl space-y-8 px-4">
        <Header
          heading="Matching Game"
          text="Test your vocabulary by matching words with their meanings"
        />

        <Card className="mx-auto max-w-2xl">
          <CardHeader className="pb-6 text-center">
            <CardTitle className="text-2xl">Ready to Match?</CardTitle>
            <p className="text-muted-foreground">
              Connect words with their correct meanings or translations
            </p>
          </CardHeader>

          <CardContent className="space-y-8">
            <div className="grid grid-cols-3 gap-6">
              <div className="space-y-2 text-center">
                <div className="bg-primary/10 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
                  <span className="text-primary text-2xl font-bold">
                    {activeGameData.length}
                  </span>
                </div>
                <p className="text-sm font-medium">Matching Sets</p>
                <p className="text-muted-foreground text-xs">Ready to play</p>
              </div>

              <div className="space-y-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                  <Link className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm font-medium">Match Pairs</p>
                <p className="text-muted-foreground text-xs">
                  {selectedDifficulty === "easy" && "4 pairs each"}
                  {selectedDifficulty === "medium" && "6 pairs each"}
                  {selectedDifficulty === "hard" && "8 pairs each"}
                </p>
              </div>

              <div className="space-y-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-purple-500/10">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
                <p className="text-sm font-medium">
                  ~
                  {selectedDifficulty === "easy"
                    ? "3"
                    : selectedDifficulty === "medium"
                      ? "5"
                      : "8"}{" "}
                  min
                </p>
                <p className="text-muted-foreground text-xs">Estimated time</p>
              </div>
            </div>

            <Separator />

            <div className="bg-muted/50 space-y-3 rounded-lg p-6">
              <div className="flex items-center gap-2">
                <div className="bg-primary h-2 w-2 rounded-full" />
                <p className="text-sm font-medium">How to Play</p>
              </div>
              <ul className="text-muted-foreground ml-4 space-y-2 text-sm">
                <li>• Click on an item from the left column to select it</li>
                <li>• Then click on the matching item from the right column</li>
                <li>• Match all pairs correctly to complete each set</li>
              </ul>
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="difficulty" className="text-sm font-medium">
                  Choose Difficulty Level
                </Label>
                <Select
                  value={selectedDifficulty}
                  onValueChange={(value: "easy" | "medium" | "hard") => {
                    setSelectedDifficulty(value);
                    setActiveGameData([]);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600">🟢</span>
                        <span>Easy</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="medium">
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-600">🟡</span>
                        <span>Medium</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="hard">
                      <div className="flex items-center gap-2">
                        <span className="text-red-600">🔴</span>
                        <span>Hard</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <div className="mb-2 flex items-center gap-2">
                  {selectedDifficulty === "easy" && (
                    <span className="text-green-600">🟢</span>
                  )}
                  {selectedDifficulty === "medium" && (
                    <span className="text-yellow-600">🟡</span>
                  )}
                  {selectedDifficulty === "hard" && (
                    <span className="text-red-600">🔴</span>
                  )}
                  <span className="font-medium capitalize">
                    {selectedDifficulty} Mode
                  </span>
                </div>
                <p className="text-muted-foreground text-sm">
                  {selectedDifficulty === "easy" &&
                    "Perfect for beginners. Match 4 pairs in each set."}
                  {selectedDifficulty === "medium" &&
                    "Moderate challenge. Match 6 pairs in each set."}
                  {selectedDifficulty === "hard" &&
                    "Maximum challenge. Match 8 pairs in each set."}
                </p>
              </div>
            </div>

            <Button
              onClick={() => {
                if (activeGameData.length === 0) {
                  loadGameDataFromDeck();
                } else {
                  handleStartGame();
                }
              }}
              size="lg"
              className="h-12 w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading {selectedDifficulty} pairs...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Start{" "}
                  {selectedDifficulty.charAt(0).toUpperCase() +
                    selectedDifficulty.slice(1)}{" "}
                  Game
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentGame) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="space-y-4 text-center">
          <Loader2 className="text-primary mx-auto h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading next matching set...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-4 px-4">
      <Header
        heading="Matching Game"
        text="Connect each word with its correct meaning"
      />

      <div className="space-y-2">
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <span>
            {currentIndex + 1} of {activeGameData.length}
          </span>
          <div className="flex items-center gap-4">
            <span>
              {score}/{activeGameData.length} perfect
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(timer)}
            </span>
          </div>
        </div>
        <Progress value={progress} className="h-1" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="space-y-3">
              <CardTitle className="text-xl">🔗 Match the Pairs</CardTitle>
              <p className="text-muted-foreground text-sm">
                Click an item on the left, then click its match on the right
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="bg-muted/30 flex flex-wrap items-center gap-3 rounded-lg border p-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Hints:</span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                onClick={toggleAudioHints}
                variant={audioHintsEnabled ? "default" : "outline"}
                size="sm"
                className="h-8"
              >
                <Volume2 className="mr-1 h-3 w-3" />
                Audio
              </Button>
            </div>

            {audioHintsEnabled && selectedLeft && (
              <>
                <Separator orientation="vertical" className="h-6" />
                <Button
                  onClick={playAudio}
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={isPlayingAudio}
                >
                  {isPlayingAudio ? (
                    <>
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      Playing...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-3 w-3" />
                      Play Audio
                    </>
                  )}
                </Button>
              </>
            )}
          </div>

          <div className="bg-muted/10 border-muted-foreground/25 rounded-lg border-2">
            <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <h3 className="font-medium">Words & Phrases</h3>
                </div>
                <div className="space-y-2">
                  {currentGame.pairs.map((pair) => {
                    const isSelected = selectedLeft === pair.left.id;
                    const userMatch = userMatches.find(
                      (m) => m.leftId === pair.left.id,
                    );
                    const isMatched = !!userMatch;
                    const isCorrect = userMatch?.isCorrect;

                    return (
                      <Button
                        key={pair.left.id}
                        onClick={() => handleLeftItemClick(pair.left.id)}
                        variant="outline"
                        className={cn(
                          "h-auto w-full justify-start p-4 text-left",
                          isSelected && "ring-primary border-primary ring-2",
                          isMatched &&
                            isCorrect &&
                            (isCompleted || hintsEnabled) &&
                            "border-green-500 bg-green-50 dark:bg-green-950/20",
                          isMatched &&
                            !isCorrect &&
                            (isCompleted || hintsEnabled) &&
                            "border-red-500 bg-red-50 dark:bg-red-950/20",
                          isCompleted && "cursor-default",
                        )}
                        disabled={isCompleted}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {isMatched && isCorrect && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                            {isMatched && !isCorrect && (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className="font-medium">
                              {pair.left.content}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {pair.left.type.charAt(0).toUpperCase() +
                              pair.left.type.slice(1)}
                          </p>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="hidden items-center justify-center lg:flex">
                <div className="text-center">
                  <CornerDownRight className="text-muted-foreground mx-auto h-8 w-8" />
                  <p className="text-muted-foreground mt-2 text-xs">
                    {selectedLeft
                      ? "Now select a match →"
                      : "Select from left first"}
                  </p>
                </div>
              </div>

              <div className="space-y-3 lg:col-start-2">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <h3 className="font-medium">Meanings & Translations</h3>
                </div>
                <div className="space-y-2">
                  {shuffledRightItems.map((rightItem) => {
                    const userMatch = userMatches.find(
                      (m) => m.rightId === rightItem.id,
                    );
                    const isMatched = !!userMatch;
                    const isCorrect = userMatch?.isCorrect;

                    return (
                      <Button
                        key={rightItem.id}
                        onClick={() => handleRightItemClick(rightItem.id)}
                        variant="outline"
                        className={cn(
                          "h-auto w-full justify-start p-4 text-left",
                          !selectedLeft && "cursor-not-allowed opacity-50",
                          isMatched &&
                            isCorrect &&
                            (isCompleted || hintsEnabled) &&
                            "border-green-500 bg-green-50 dark:bg-green-950/20",
                          isMatched &&
                            !isCorrect &&
                            (isCompleted || hintsEnabled) &&
                            "border-red-500 bg-red-50 dark:bg-red-950/20",
                          isCompleted && "cursor-default",
                        )}
                        disabled={!selectedLeft || isCompleted}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {isMatched && isCorrect && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                            {isMatched && !isCorrect && (
                              <XCircle className="h-4 w-4 text-red-600" />
                            )}
                            <span className="font-medium">
                              {rightItem.content}
                            </span>
                          </div>
                          <p className="text-muted-foreground text-xs">
                            {rightItem.type.charAt(0).toUpperCase() +
                              rightItem.type.slice(1)}
                          </p>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Progress: {userMatches.length}/{currentGame.pairs.length} pairs
              matched
            </span>
            {userMatches.length > 0 && (
              <span className="text-muted-foreground">
                Correct: {userMatches.filter((m) => m.isCorrect).length}/
                {userMatches.length}
              </span>
            )}
          </div>

          {showResult && (
            <Card
              className={cn(
                "border-2",
                userMatches.every((m) => m.isCorrect)
                  ? "border-green-500 bg-green-50 dark:bg-green-950/20"
                  : "border-red-500 bg-red-50 dark:bg-red-950/20",
              )}
            >
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-3">
                    {userMatches.every((m) => m.isCorrect) ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600" />
                    )}
                    <h3 className="text-lg font-semibold">
                      {userMatches.every((m) => m.isCorrect)
                        ? "Perfect! All pairs matched correctly! 🎉"
                        : `${userMatches.filter((m) => m.isCorrect).length}/${currentGame.pairs.length} correct 💪`}
                    </h3>
                  </div>

                  {!userMatches.every((m) => m.isCorrect) &&
                    showCorrectAnswers && (
                      <div className="space-y-3">
                        <Separator />
                        <div>
                          <h4 className="mb-3 font-medium">Correct Matches:</h4>
                          <div className="space-y-2">
                            {currentGame.pairs.map((pair, index) => (
                              <div key={pair.id} className="flex gap-3 text-sm">
                                <span className="bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold">
                                  {index + 1}
                                </span>
                                <p className="flex-1">
                                  <span className="font-medium">
                                    {pair.left.content}
                                  </span>
                                  <span className="text-muted-foreground mx-2">
                                    →
                                  </span>
                                  <span className="font-medium">
                                    {pair.right.content}
                                  </span>
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              onClick={handleRestart}
              variant="outline"
              size="sm"
              className="sm:w-auto"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset Matches
            </Button>

            {!isCompleted && userMatches.length > 0 && (
              <Button
                onClick={handleCheckAnswer}
                variant="outline"
                size="sm"
                className="sm:w-auto"
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Check Matches
              </Button>
            )}

            {isCompleted &&
              !userMatches.every((m) => m.isCorrect) &&
              !showCorrectAnswers && (
                <Button
                  onClick={handleShowAnswers}
                  variant="secondary"
                  size="sm"
                  className="sm:w-auto"
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Show Answers
                </Button>
              )}

            {isCompleted && (
              <Button onClick={handleNext} className="flex-1">
                {currentIndex < activeGameData.length - 1
                  ? "Next Set"
                  : "Finish Game"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
