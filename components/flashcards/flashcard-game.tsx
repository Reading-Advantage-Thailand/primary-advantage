"use client";
import React, { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Volume2,
  Trophy,
  RotateCcw,
  Clock,
  Target,
  Zap,
  CheckCircle,
  Loader2,
  Brain,
  Play,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { reviewCard } from "@/actions/flashcard";
import AudioButton from "../audio-button";
import { Rating } from "ts-fsrs";
import { cn } from "@/lib/utils";

interface FlashcardGameInlineProps {
  deck: {
    id: string;
    name: string | null;
    type: "VOCABULARY" | "SENTENCE";
  };
  cards: any[];
  selectedLanguage?: string;
  onComplete: () => void;
  onBack: () => void;
}

export function FlashcardGameInline({
  deck,
  cards: initialCards,
  selectedLanguage,
  onComplete,
  onBack,
}: FlashcardGameInlineProps) {
  const [cards, setCards] = useState(
    initialCards.map((card) => ({ ...card, flipped: false })),
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedCards, setCompletedCards] = useState(0);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [cardRating, setCardRating] = useState<{ [cardId: string]: Rating }>(
    {},
  );

  const currentCard = cards[currentIndex];
  const progress = cards.length > 0 ? (completedCards / cards.length) * 100 : 0;

  const handleFlipCard = () => {
    setCards((prev) =>
      prev.map((card, index) =>
        index === currentIndex ? { ...card, flipped: !card.flipped } : card,
      ),
    );
  };

  const handleCardRating = async (rating: Rating) => {
    if (isPending) return;

    setCardRating((prev) => ({ ...prev, [currentCard.id]: rating }));

    if (currentIndex < cards.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setCompletedCards((prev) => prev + 1);

      setCards((prev) =>
        prev.map((card, index) =>
          index === currentIndex + 1 ? { ...card, flipped: false } : card,
        ),
      );
    } else {
      const finalCompleted = completedCards + 1;
      setCompletedCards(finalCompleted);

      startTransition(async () => {
        try {
          const reviewPromises = Object.entries({
            ...cardRating,
            [currentCard.id]: rating,
          }).map(([cardId, cardRating]) =>
            reviewCard(cardId, cardRating as Rating),
          );

          const results = await Promise.all(reviewPromises);

          const allSuccess = results.every((r) => r.success);

          if (allSuccess) {
            setSessionComplete(true);
          } else {
            toast.error("Failed to save ratings");
          }
        } catch (error) {
          console.error("Error rating cards:", error);
          toast.error("Failed to save ratings");
        }
      });
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setCompletedCards(0);
    setSessionComplete(false);
    setCardRating({});
    setCards((prev) => prev.map((card) => ({ ...card, flipped: false })));
  };

  if (sessionComplete) {
    const accuracy = Math.round((completedCards / cards.length) * 100);

    return (
      <div className="container mx-auto max-w-4xl px-4 py-8">
        <div className="space-y-8 text-center">
          {/* Trophy Animation */}
          <div className="relative">
            <div className="animate-bounce">
              <Trophy className="mx-auto h-24 w-24 text-yellow-500" />
            </div>
          </div>

          {/* Results Header */}
          <div className="space-y-4">
            <h1 className="gradient-text text-4xl font-bold md:text-5xl">
              🎉 Study Session Complete!
            </h1>
            <p className="text-muted-foreground text-xl">
              You completed {completedCards} flashcards
            </p>
          </div>

          {/* Stats Grid */}
          <div className="mx-auto grid max-w-2xl grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="relative overflow-hidden">
              <CardContent className="p-6 text-center">
                <Target className="mx-auto mb-3 h-8 w-8 text-blue-500" />
                <div className="text-3xl font-bold text-blue-600">
                  {completedCards}
                </div>
                <p className="text-muted-foreground text-sm">Cards Reviewed</p>
              </CardContent>
            </Card>

            {/* <Card className="relative overflow-hidden">
              <CardContent className="p-6 text-center">
                <Zap className="mx-auto mb-3 h-8 w-8 text-green-500" />
                <div className="text-3xl font-bold text-green-600">
                  {accuracy}%
                </div>
                <p className="text-muted-foreground text-sm">Completion Rate</p>
              </CardContent>
            </Card> */}

            <Card className="relative overflow-hidden">
              <CardContent className="p-6 text-center">
                <Brain className="mx-auto mb-3 h-8 w-8 text-purple-500" />
                <div className="text-3xl font-bold text-purple-600">
                  +{completedCards * 3}
                </div>
                <p className="text-muted-foreground text-sm">XP Earned</p>
              </CardContent>
            </Card>
          </div>

          {/* Achievement Alert */}
          <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              Great work! You've successfully completed this study session. Your
              progress has been saved!
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="mx-auto flex max-w-md flex-col gap-4 sm:flex-row">
            <Button
              onClick={onComplete}
              size="lg"
              variant="outline"
              className="flex-1"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <Button onClick={handleRestart} size="lg" className="flex-1">
              <RotateCcw className="mr-2 h-4 w-4" />
              Study Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-4xl space-y-4 px-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="h-10">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant={deck.type === "VOCABULARY" ? "default" : "secondary"}>
            {deck.type === "VOCABULARY" ? "📚" : "📝"} {deck.type}
          </Badge>
        </div>
      </div>

      {/* Progress Section */}
      <div className="space-y-2">
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <span>Study Session Progress</span>
          <span>
            {completedCards} / {cards.length} completed
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        <div className="text-center">
          <Badge variant="outline" className="text-xs">
            {cards.length - completedCards - 1} remaining
          </Badge>
        </div>
      </div>

      {/* Flashcard */}
      <Card className="relative min-h-[500px] overflow-hidden">
        <CardContent className="p-0">
          <div
            className="relative h-[500px] cursor-pointer"
            onClick={handleFlipCard}
            style={{ perspective: "1000px" }}
          >
            <div
              className="absolute inset-0 h-full w-full transition-transform duration-700"
              style={{
                transformStyle: "preserve-3d",
                transform: currentCard?.flipped
                  ? "rotateY(180deg)"
                  : "rotateY(0deg)",
              }}
            >
              {/* Front Side */}
              <div className="absolute inset-0 flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-8 backface-hidden dark:from-blue-950/20 dark:to-indigo-950/20">
                <div className="space-y-8 text-center">
                  <Badge
                    variant="secondary"
                    className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                  >
                    Question
                  </Badge>

                  <div className="space-y-4">
                    <h2 className="text-4xl leading-tight font-bold">
                      {deck.type === "VOCABULARY"
                        ? currentCard?.word
                        : `"${currentCard?.sentence}"`}
                    </h2>

                    {currentCard?.audioUrl && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex justify-center"
                      >
                        <AudioButton
                          audioUrl={currentCard.audioUrl}
                          startTimestamp={currentCard.startTime}
                          endTimestamp={currentCard.endTime}
                        />
                      </div>
                    )}
                  </div>

                  <div className="mx-auto max-w-sm rounded-lg bg-white/80 p-4 dark:bg-gray-900/80">
                    <p className="text-muted-foreground text-sm font-medium">
                      💡 Click to reveal{" "}
                      {deck.type === "VOCABULARY"
                        ? "definition"
                        : "translation"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Back Side */}
              <div className="absolute inset-0 flex h-full w-full rotate-y-180 items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-8 backface-hidden dark:from-green-950/20 dark:to-emerald-950/20">
                <div className="space-y-8 text-center">
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  >
                    Answer
                  </Badge>

                  <div className="space-y-4">
                    <h3 className="text-muted-foreground text-xl font-medium">
                      {deck.type === "VOCABULARY"
                        ? currentCard?.word
                        : `"${currentCard?.sentence}"`}
                    </h3>

                    <Separator className="mx-auto max-w-xs" />

                    <div className="text-3xl leading-tight font-bold">
                      {deck.type === "VOCABULARY"
                        ? currentCard?.definition?.[
                            selectedLanguage as "en" | "th" | "cn" | "tw" | "vi"
                          ] || "Definition not available"
                        : currentCard?.translation?.[
                            selectedLanguage as "th" | "cn" | "tw" | "vi"
                          ] || "Translation not available"}
                    </div>

                    {currentCard?.audioUrl && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="flex justify-center"
                      >
                        <AudioButton
                          audioUrl={currentCard.audioUrl}
                          startTimestamp={currentCard.startTime}
                          endTimestamp={currentCard.endTime}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controls */}
      {currentCard?.flipped ? (
        <Card>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {[
                {
                  rating: Rating.Again,
                  label: "Again",
                  color: "bg-red-500 hover:bg-red-600 text-white",
                },
                {
                  rating: Rating.Hard,
                  label: "Hard",
                  color: "bg-orange-500 hover:bg-orange-600 text-white",
                },
                {
                  rating: Rating.Good,
                  label: "Good",
                  color: "bg-blue-500 hover:bg-blue-600 text-white",
                },
                {
                  rating: Rating.Easy,
                  label: "Easy",
                  color: "bg-green-500 hover:bg-green-600 text-white",
                },
              ].map(({ rating, label, color }) => (
                <Button
                  key={rating}
                  onClick={() => handleCardRating(rating)}
                  disabled={isPending}
                  className={cn(
                    "h-20 flex-col transition-all duration-200 hover:scale-105",
                    color,
                  )}
                >
                  {isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <div className="text-base font-semibold">{label}</div>
                  )}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          onClick={handleFlipCard}
          className="h-16 w-full text-lg font-medium"
          size="lg"
        >
          <Play className="mr-2 h-5 w-5" />
          Show Answer
        </Button>
      )}

      {/* Stats */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-center gap-8 text-center text-sm">
            <div className="space-y-1">
              <div className="text-2xl font-bold text-blue-600">
                {currentIndex + 1}
              </div>
              <div className="text-muted-foreground text-xs">Current</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-green-600">
                {completedCards}
              </div>
              <div className="text-muted-foreground text-xs">Completed</div>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-bold text-purple-600">
                {cards.length - completedCards - 1}
              </div>
              <div className="text-muted-foreground text-xs">Remaining</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
