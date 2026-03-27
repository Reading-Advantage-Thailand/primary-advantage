"use client";
import { DragonRiderGame } from "@/components/games/vocabulary/dragon-rider/DragonRiderGame";
import { EnchantedLibraryGame } from "@/components/games/vocabulary/enchanted-library/EnchantedLibraryGame";
import RPGBattle from "@/components/games/vocabulary/rpg-battle/RPGBattle";
import { RuneMatchGame } from "@/components/games/vocabulary/rune-match/RuneMatchGame";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getGamesList } from "@/configs/games-data";
import {
  useLessonVocabulary,
  useLessonGameResult,
  useSubmitLessonGamesResult,
} from "@/hooks/use-lesson-vocabulary";
import {
  ArrowLeft,
  CheckCircle2,
  Languages,
  RotateCcw,
  Shield,
  Trophy,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { VOCABULARY_LANGUAGES } from "../../flashcards/deck-view";

type GameId =
  | "rpg-battle"
  | "rune-match"
  | "dragon-rider"
  | "enchanted-library";

interface GameOption {
  id: GameId;
  title: string;
  description: string;
  icon: any;
  coverImage: string;
  color: string;
  difficulty: string;
  type: string;
}

interface GameResult {
  score?: number;
  xp?: number;
  accuracy?: number | undefined;
  correctAnswers?: number;
  totalAttempts?: number;
  gameId?: GameId;
}

export default function LessonVocabularyMatching({
  articleId,
}: {
  articleId: string;
}) {
  const t = useTranslations("Lesson.VocabularyMatching");
  const tg = useTranslations("games");
  // Game state

  const [selectedLanguage, setSelectedLanguage] = useState<string>("th");
  const [lastResult, setLastResult] = useState<GameResult | null>(null);
  const [vocabError, setVocabError] = useState<string | null>(null);
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const GamesLists = getGamesList(tg);
  const VOCABULARY_GAMES = GamesLists.vocabulary;
  const Games = VOCABULARY_GAMES.filter(
    (game) => game.id !== "enchanted-library",
  ); // Temporarily exclude Enchanted Library until it's ready

  const languageOptions = VOCABULARY_LANGUAGES;

  // Fetch previous game result from DB
  const { result: dbResult, isLoading: isResultLoading } =
    useLessonGameResult(articleId);

  useEffect(() => {
    if (dbResult && !lastResult) {
      setLastResult({
        score: dbResult.score,
        xp: dbResult.xp,
        accuracy: dbResult.accuracy,
        correctAnswers: dbResult.correctAnswers,
        totalAttempts: dbResult.totalAttempts,
        gameId: (dbResult.gameId as GameId) ?? undefined,
      });
    }
  }, [dbResult, lastResult]);

  // Fetch vocabulary from article via TanStack Query
  const {
    vocabulary: fetchedVocabulary,
    isLoading: isVocabularyLoading,
    isError: isVocabularyError,
    error: vocabularyError,
  } = useLessonVocabulary({ articleId, language: selectedLanguage });

  const { submitResult, isSubmitting } = useSubmitLessonGamesResult();

  const handleComplete = async (result: GameResult) => {
    const gameResult: GameResult = {
      score: result.score || 0,
      xp: result.xp || 0,
      accuracy: result.accuracy || 0,
      correctAnswers: result.correctAnswers || 0,
      totalAttempts: result.totalAttempts || 0,
      gameId: activeGame!,
    };
    setLastResult(gameResult);
    setActiveGame(null);
    try {
      await submitResult({
        articleId,
        gameId: gameResult.gameId!,
        xp: gameResult.xp,
        score: gameResult.score,
        correctAnswers: gameResult.correctAnswers,
        totalAttempts: gameResult.totalAttempts,
        accuracy: gameResult.accuracy,
        difficulty: gameResult.gameId,
      });
    } catch (error) {
      console.error("Failed to submit game results:", error);
    }
  };

  const handlePlayGame = (gameId: GameId) => {
    setActiveGame(gameId);
  };

  // --- RENDER: Active Game ---
  if (activeGame) {
    if (typeof document === "undefined") return null;

    return createPortal(
      <div className="animate-in fade-in fixed inset-0 z-100 flex items-center justify-center p-4 duration-300 sm:p-8">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          onClick={() => setActiveGame(null)}
        />

        {/* Modal Container */}
        <div className="relative flex h-full w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl sm:max-h-[90vh] md:max-h-[80vh]">
          {/* Header */}
          <div className="z-10 flex shrink-0 items-center justify-between border-b border-slate-800/50 bg-slate-900/50 p-4 backdrop-blur-md">
            <Button
              size="sm"
              onClick={() => setActiveGame(null)}
              className="text-slate-400 hover:bg-slate-800/50 hover:text-white"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {tg("backToLessons")}
            </Button>
            <div className="text-lg font-bold text-slate-200">
              {VOCABULARY_GAMES.find((g) => g.id === activeGame)?.title}
            </div>
            <div className="w-24" /> {/* Spacer */}
          </div>

          {/* Game Content */}
          <div className="relative">
            {activeGame === "rune-match" && (
              <div className="h-full w-full">
                <RuneMatchGame
                  vocabulary={fetchedVocabulary}
                  onComplete={handleComplete}
                />
              </div>
            )}

            {activeGame === "rpg-battle" && (
              <div className="h-full w-full">
                <RPGBattle
                  vocabulary={fetchedVocabulary}
                  onComplete={handleComplete}
                  mode="lesson"
                />
              </div>
            )}

            {activeGame === "dragon-rider" && (
              <div className="h-full w-full">
                <DragonRiderGame
                  vocabulary={fetchedVocabulary}
                  onComplete={handleComplete}
                  mode="lesson"
                />
              </div>
            )}

            {/* {activeGame === "enchanted-library" && (
              <div className="h-full w-full">
                <EnchantedLibraryGame
                  vocabulary={fetchedVocabulary}
                  onComplete={handleComplete}
                  mode="lesson"
                />
              </div>
            )} */}
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  return (
    <div className="animate-in slide-in-from-bottom-4 fade-in mx-auto max-w-6xl space-y-8 duration-500">
      {/* Language Selector */}
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="w-full max-w-md space-y-4">
          <div className="flex items-center justify-center gap-2">
            <Languages className="h-5 w-5 text-indigo-500" />
            <Label className="text-base font-semibold">
              {tg("selectTranslation")}
            </Label>
          </div>
          <Select
            value={selectedLanguage}
            onValueChange={(value) => {
              setSelectedLanguage(value);
            }}
          >
            <SelectTrigger className="h-12 w-full">
              <SelectValue>
                {selectedLanguage && (
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {
                        languageOptions[
                          selectedLanguage as keyof typeof languageOptions
                        ]?.flag
                      }
                    </span>
                    <div className="flex flex-col text-left">
                      <span className="font-medium">
                        {
                          languageOptions[
                            selectedLanguage as keyof typeof languageOptions
                          ]?.name
                        }
                      </span>
                      <span className="text-muted-foreground text-xs">
                        {
                          languageOptions[
                            selectedLanguage as keyof typeof languageOptions
                          ]?.nativeName
                        }
                      </span>
                    </div>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {Object.values(languageOptions).map((language) => (
                <SelectItem key={language.code} value={language.code}>
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{language.flag}</span>
                    <div className="flex flex-col">
                      <span className="font-medium">{language.name}</span>
                      <span className="text-muted-foreground text-xs">
                        {language.nativeName}
                      </span>
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isVocabularyLoading && (
        <div className="flex flex-col items-center gap-2 p-6 text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <div className="text-muted-foreground text-sm">
            Loading vocabulary...
          </div>
        </div>
      )}

      {vocabError && (
        <div className="bg-destructive/10 border-destructive/20 text-destructive flex flex-col items-center gap-2 rounded-xl border p-6 text-center">
          <Shield className="h-8 w-8" />
          <div className="font-semibold">{t("phase10.failedToLoad")}</div>
          <div className="text-sm opacity-80">{vocabError}</div>
        </div>
      )}

      {!vocabError && !isVocabularyLoading && (
        <>
          {/* Summary Card (If Completed) */}
          {lastResult && (
            <div className="mb-12 transform overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 p-1 shadow-2xl transition-all hover:scale-[1.01]">
              <div className="relative overflow-hidden rounded-[22px] bg-linear-to-br from-slate-900 to-slate-950 p-8">
                {/* Background FX */}
                <div className="pointer-events-none absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/10 p-48 blur-[100px]" />
                <div className="pointer-events-none absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 rounded-full bg-blue-500/10 p-32 blur-[80px]" />

                <div className="relative z-10 flex flex-col items-center justify-between gap-4 md:flex-row">
                  <div className="flex items-center gap-6">
                    <div className="relative">
                      <div className="absolute inset-0 animate-pulse bg-green-500 opacity-20 blur-xl" />
                      <div className="flex h-16 w-16 rotate-3 transform items-center justify-center rounded-2xl bg-linear-to-br from-green-400 to-emerald-600 shadow-lg">
                        <Trophy className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <h3 className="text-2xl font-bold text-white">
                          {t("awesome")}
                        </h3>
                        <Badge className="border-0 bg-green-500/20 text-green-400 hover:bg-green-500/30">
                          {t("completed.completed")}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-400">
                        {t("youCompleted")}{" "}
                        <b>
                          {
                            VOCABULARY_GAMES.find(
                              (g) => g.id === lastResult.gameId,
                            )?.title
                          }
                        </b>
                        .
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-8 rounded-2xl border border-white/5 bg-slate-950/50 p-4 md:gap-12">
                    <div className="text-center">
                      <div className="mb-1 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                        {t("score")}
                      </div>
                      <div className="text-3xl font-black text-yellow-400 tabular-nums">
                        {lastResult.score}
                      </div>
                    </div>
                    <div className="h-10 w-px bg-white/10" />
                    <div className="text-center">
                      <div className="mb-1 text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                        {t("accuracy")}
                      </div>
                      <div className="text-3xl font-black text-blue-400 tabular-nums">
                        {Math.round((lastResult?.accuracy || 0) * 100)}
                        <span className="ml-0.5 text-lg">%</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-2 md:w-auto">
                    <Button
                      onClick={() => handlePlayGame(lastResult.gameId!)}
                      size="lg"
                      className="w-full rounded-xl bg-white font-bold text-slate-950 shadow-lg shadow-white/5 hover:bg-slate-200 md:w-auto"
                    >
                      <RotateCcw className="mr-2 h-4 w-4" />
                      {t("playAgain")}
                    </Button>
                    <p className="text-center text-[10px] text-slate-500">
                      {t("continueNext")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Game Selection Grid */}
          <div className="space-y-4">
            {!lastResult && (
              <div className="flex items-center gap-2 px-1 text-sm font-medium text-slate-500">
                <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                {t("chooseGames.title")}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
              {Games.map((game) => {
                const Icon = game.icon;
                const isLastPlayed = lastResult?.gameId === game.id;

                return (
                  <Card
                    key={game.id}
                    className={`group relative flex cursor-pointer flex-col overflow-hidden border-2 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl ${
                      isLastPlayed
                        ? "border-green-500/50 ring-4 ring-green-500/10 dark:bg-slate-900"
                        : "border-transparent bg-white shadow-md hover:border-purple-500/30 dark:bg-slate-900/50"
                    } `}
                    onClick={() => setActiveGame(game.id as GameId)}
                  >
                    <CardHeader className="relative -mt-6 h-40 w-full overflow-hidden">
                      <Image
                        src={game.coverImage}
                        alt={game.title}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-110"
                      />
                      <div
                        className={`absolute inset-0 bg-linear-to-t ${game.color} opacity-20 transition-opacity duration-300 group-hover:opacity-30`}
                      />

                      <div className="absolute top-3 right-3">
                        <Badge
                          // variant="secondary"
                          className="border-white/20 bg-white/20 text-white shadow-sm backdrop-blur-md"
                        >
                          {game.difficulty}
                        </Badge>
                      </div>

                      <div className="absolute bottom-3 left-3 flex items-center gap-3">
                        <div className="text-primary transform rounded-xl bg-white/90 p-2.5 shadow-lg backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 dark:bg-slate-950/90">
                          <Icon className="h-5 w-5" />
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="flex flex-1 flex-col p-5">
                      <div className="mb-2">
                        <h3 className="text-lg leading-tight font-bold transition-colors group-hover:text-purple-600 dark:group-hover:text-purple-400">
                          {game.title}
                        </h3>
                        <div className="text-muted-foreground mt-1 text-xs font-medium">
                          {game.type}
                        </div>
                      </div>
                      <p className="line-clamp-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                        {game.description}
                      </p>

                      {isLastPlayed && (
                        <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs font-bold text-green-600 dark:border-slate-800 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3" />
                          {t("lastPlayed")}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
