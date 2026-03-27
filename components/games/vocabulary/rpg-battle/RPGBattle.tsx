"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useGameStore } from "@/store/useGameStore";
import { BattleStatus, useRPGBattleStore } from "@/store/useRPGBattleStore";
import {
  selectBattleActions,
  WordPerformance,
} from "@/lib/games/rpg-battle/rpgBattleWordSelection";
import { calculateRpgBattleXp } from "@/lib/games/rpg-battle/rpgBattleXp";
import {
  battleEnemies,
  battleHeroes,
  battleLocations,
} from "@/lib/games/rpg-battle/rpgBattleSelection";
import {
  rollEnemyDamage,
  scaleBattleXp,
  scaleEnemyHealth,
} from "@/lib/games/rpg-battle/rpgBattleScaling";
import { ActionMenu } from "@/components/games/vocabulary/rpg-battle/ActionMenu";
import { BattleScene } from "@/components/games/vocabulary/rpg-battle/BattleScene";
import { BattleLog } from "@/components/games/vocabulary/rpg-battle/BattleLog";
import { HealthBar } from "@/components/games/vocabulary/rpg-battle/HealthBar";
import { Sprite } from "@/components/games/vocabulary/rpg-battle/Sprite";
import { BattleResults } from "@/components/games/vocabulary/rpg-battle/BattleResults";
import { BattleEffects } from "@/components/games/vocabulary/rpg-battle/BattleEffects";
import { BattleSelectionModal } from "@/components/games/vocabulary/rpg-battle/BattleSelectionModal";
import { FloatingTextItem } from "@/components/games/vocabulary/rpg-battle/FloatingText";
import { useRPGBattleVocabulary } from "@/hooks/use-rpg-battle";
import { useSound } from "@/hooks/useSound";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  AlertCircle,
  ChevronLeft,
  Swords,
  BookOpen,
  Sparkles,
  Shield,
  Book,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { GameStartScreen } from "../../GameStartScreen";
import { VocabularyItem } from "@/store/useGameStore";
import { GameEndScreen } from "../../GameEndScreen";

const ACTION_COUNT = 3;
const BASIC_DAMAGE = 10;
const POWER_DAMAGE = 18;
const MAX_TURNS = 12;

export type RPGBattleCompleteResult = {
  xp: number;
  accuracy: number;
  totalAttempts: number;
  totalCorrect: number;
  turnsTaken: number;
  heroId: string | null;
  enemyId: string | null;
  outcome: "victory" | "defeat";
  score?: number;
  correctAnswers?: number;
};

export type RPGBattleGameProps = {
  vocabulary: VocabularyItem[];
  onComplete?: (results: RPGBattleCompleteResult) => void;
  mode?: "normal" | "lesson";
  selectedLanguage?: string;
  onLanguageChange?: (language: string) => void;
};

export default function RPGBattle({
  vocabulary,
  onComplete,
  mode = "normal",
  selectedLanguage,
  onLanguageChange,
}: RPGBattleGameProps) {
  const t = useTranslations("games");
  const setLastResult = useGameStore((state) => state.setLastResult);

  const {
    playerHealth,
    playerMaxHealth,
    enemyHealth,
    enemyMaxHealth,
    turn,
    status,
    battleLog,
    playerPose,
    enemyPose,
    inputLocked,
    revealedTranslation,
    selectionStep,
    selectedHeroId,
    selectedLocationId,
    selectedEnemyId,
    streak,
    initializeBattle,
    setStatus,
    setTurn,
    damageEnemy,
    enemyAttack,
    submitAnswer,
    addLogEntry,
    selectHero,
    selectLocation,
    selectEnemy,
    resetSelection,
  } = useRPGBattleStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [performance, setPerformance] = useState<
    Record<string, WordPerformance>
  >({});
  const [turnsTaken, setTurnsTaken] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [flashKey, setFlashKey] = useState(0);
  const [flashTone, setFlashTone] = useState<"player" | "enemy">("enemy");
  const [showResults, setShowResults] = useState(false);
  const [resultXp, setResultXp] = useState(1);
  const [resultAccuracy, setResultAccuracy] = useState(0);
  const [heroSprite, setHeroSprite] = useState(() => battleHeroes[0].sprite);
  const [enemySprite, setEnemySprite] = useState(() => battleEnemies[0].sprite);
  const [gameStatus, setGameStatus] = useState<BattleStatus>("idle");
  const { playSound } = useSound();

  // ─── TanStack Query: vocabulary + submit ─────────────────────────────
  const {
    vocabulary: fetchedVocabulary,
    isLoading,
    isError,
    isFetching,
  } = useRPGBattleVocabulary({ language: selectedLanguage });

  const resultsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guard: ensure handleGameComplete runs only once per battle even if deps change
  const hasSavedResultRef = useRef(false);

  // Game key to force remount on restart if needed,
  // currently used primarily to trigger data refetch if logic dictates,
  // but here we might just reset state.
  const [gameKey, setGameKey] = useState(0);
  const [showStartScreen, setShowStartScreen] = useState(true);
  const [floatingTexts, setFloatingTexts] = useState<FloatingTextItem[]>([]);

  const spawnFloatingText = (
    text: string,
    x: number,
    y: number,
    type: FloatingTextItem["type"],
  ) => {
    const id = Math.random().toString(36).substring(7);
    setFloatingTexts((prev) => [...prev, { id, text, x, y, type }]);

    // Auto remove after animation
    setTimeout(() => {
      setFloatingTexts((prev) => prev.filter((item) => item.id !== id));
    }, 1000);
  };

  const selectedEnemy = useMemo(
    () => battleEnemies.find((enemy) => enemy.id === selectedEnemyId),
    [selectedEnemyId],
  );
  const enemyMultiplier = selectedEnemy?.multiplier ?? 1;
  const selectedLocation = useMemo(
    () =>
      battleLocations.find((location) => location.id === selectedLocationId),
    [selectedLocationId],
  );

  useEffect(() => {
    if (vocabulary.length > 0 && !showStartScreen) {
      // Only reset selection if we have vocabulary loaded and not showing start screen
      resetSelection();
      setStatus("idle");
    }
  }, [resetSelection, setStatus, vocabulary.length, gameKey, showStartScreen]);

  useEffect(() => {
    if (selectionStep !== "ready" || !selectedHeroId || !selectedEnemyId) {
      return;
    }

    const heroSelection =
      battleHeroes.find((hero) => hero.id === selectedHeroId) ??
      battleHeroes[0];
    const enemySelection = selectedEnemy ?? battleEnemies[0];

    setHeroSprite(heroSelection.sprite);
    setEnemySprite(enemySelection.sprite);
    initializeBattle({
      enemyMaxHealth: scaleEnemyHealth(enemySelection.multiplier),
    });
  }, [
    initializeBattle,
    selectedEnemy,
    selectedEnemyId,
    selectedHeroId,
    selectionStep,
  ]);

  useEffect(() => {
    setLongestStreak((prev) => Math.max(prev, streak));
  }, [streak]);

  const actions = useMemo(
    () => selectBattleActions(vocabulary, performance, { count: ACTION_COUNT }),
    [performance, vocabulary],
  );

  const { totalCorrect, totalAttempts } = useMemo(() => {
    return Object.values(performance).reduce(
      (acc, entry) => ({
        totalCorrect: acc.totalCorrect + entry.correct,
        totalAttempts: acc.totalAttempts + entry.attempts,
      }),
      { totalCorrect: 0, totalAttempts: 0 },
    );
  }, [performance]);

  const pendingResultRef = useRef<RPGBattleCompleteResult | null>(null);

  const handleGameComplete = useCallback(
    (xp: number, accuracy: number, outcome: "victory" | "defeat") => {
      // Guard against duplicate calls caused by dep-array re-fires
      if (hasSavedResultRef.current) return;
      hasSavedResultRef.current = true;

      setLastResult(xp, accuracy);

      // Store result data so onComplete can be called after results screen is shown
      pendingResultRef.current = {
        xp,
        accuracy,
        totalAttempts,
        totalCorrect,
        turnsTaken: Math.max(1, turnsTaken),
        heroId: selectedHeroId,
        enemyId: selectedEnemyId,
        outcome,
        score: xp,
        correctAnswers: totalCorrect,
      };
    },
    [
      selectedHeroId,
      selectedEnemyId,
      totalAttempts,
      totalCorrect,
      turnsTaken,
      setLastResult,
    ],
  );

  const flushOnComplete = useCallback(() => {
    if (pendingResultRef.current) {
      onComplete?.(pendingResultRef.current);
      pendingResultRef.current = null;
    }
  }, [onComplete]);

  useEffect(() => {
    if (resultsTimeoutRef.current) {
      clearTimeout(resultsTimeoutRef.current);
      resultsTimeoutRef.current = null;
    }

    if (status === "victory" || status === "defeat") {
      const accuracy = totalAttempts > 0 ? totalCorrect / totalAttempts : 0;
      setResultAccuracy(accuracy);
      const baseXp = calculateRpgBattleXp({
        playerHealth,
        playerMaxHealth,
        turnsTaken: Math.max(1, turnsTaken),
        maxTurns: MAX_TURNS,
        longestStreak,
      });
      const finalXp = scaleBattleXp(baseXp, enemyMultiplier);
      setResultXp(finalXp);

      // Call handleGameComplete to save results (guarded by hasSavedResultRef)
      handleGameComplete(finalXp, accuracy, status);

      setShowResults(false);
      resultsTimeoutRef.current = setTimeout(() => {
        setShowResults(true);
      }, 1200);
    } else {
      setShowResults(false);
    }

    return () => {
      if (resultsTimeoutRef.current) {
        clearTimeout(resultsTimeoutRef.current);
        resultsTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]); // intentionally narrow: only re-run when battle outcome changes

  const menuActions = useMemo(
    () =>
      actions.map((action) => ({
        id: action.id,
        label: action.term,
        power: action.power,
      })),
    [actions],
  );

  const updatePerformance = (term: string, correct: boolean) => {
    setPerformance((prev) => {
      const current = prev[term] ?? { correct: 0, attempts: 0 };
      return {
        ...prev,
        [term]: {
          correct: current.correct + (correct ? 1 : 0),
          attempts: current.attempts + 1,
        },
      };
    });
  };

  const triggerEnemyTurn = () => {
    const damage = rollEnemyDamage(enemyMultiplier);
    setTurn("enemy");
    setTimeout(() => {
      enemyAttack(damage);
      spawnFloatingText(`-${damage}`, 20, 60, "damage-player"); // Player position
      setTurnsTaken((prev) => prev + 1);
      setFlashTone("player");
      setFlashKey((prev) => prev + 1);
      setShakeKey((prev) => prev + 1);
      addLogEntry("Enemy strikes back!", "enemy");
      playSound("missile-hit");
    }, 600);
  };

  const handleSubmit = (value: string) => {
    if (status !== "playing" || inputLocked || turn !== "player") return;

    const normalized = value.trim().toLowerCase();
    const matched = actions.find(
      (action) => action.translation.toLowerCase() === normalized,
    );
    const fallback =
      actions.find((action) => action.power === "power") ?? actions[0];

    if (matched) {
      // Calculate damage with streak bonus
      const baseDamage =
        matched.power === "power" ? POWER_DAMAGE : BASIC_DAMAGE;
      // Bonus: +1 damage for every 2 streak
      const streakBonus = Math.floor(streak / 2);
      const damage = baseDamage + streakBonus;

      const nextEnemyHealth = Math.max(0, enemyHealth - damage);

      submitAnswer(value, matched.translation, matched.power);
      playSound("success");

      // TTS: Speak the word
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(matched.term);
        utterance.lang = "en-US"; // Assume English terms for now
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      }

      updatePerformance(matched.term, true);
      addLogEntry(`You cast ${matched.term}!`, "player");
      damageEnemy(damage);
      spawnFloatingText(`-${damage}`, 80, 40, "damage-enemy");
      if (Math.random() > 0.8) {
        setTimeout(() => {
          spawnFloatingText("CRITICAL!", 80, 20, "crit");
        }, 200);
      }
      setTurnsTaken((prev) => prev + 1);
      setFlashTone("enemy");
      setFlashKey((prev) => prev + 1);
      setShakeKey((prev) => prev + 1);
      setInputValue("");

      if (nextEnemyHealth > 0) {
        triggerEnemyTurn();
      }
      return;
    }

    if (fallback) {
      submitAnswer(value, fallback.translation);
      playSound("error");
      updatePerformance(fallback.term, false);
      addLogEntry(
        `Incorrect! The spell was ${fallback.translation}.`,
        "system",
      );
      setInputValue("");
      // Trigger enemy turn on incorrect answer
      triggerEnemyTurn();
    }
  };

  const handleRestart = () => {
    setInputValue("");
    setTurnsTaken(0);
    setLongestStreak(0);
    setFlashKey(0);
    setShakeKey(0);
    setFlashTone("enemy");
    setShowResults(false);
    setResultXp(1);
    setResultAccuracy(0);
    setPerformance({}); // Reset performance on restart
    hasSavedResultRef.current = false; // Allow saving again for the next battle
    pendingResultRef.current = null;
    resetSelection(); // Reset hero/enemy selection so player goes through selection again
    setShowStartScreen(true); // Show start screen again
    setStatus("idle"); // Reset status to idle
    // Increment gameKey to potentially re-fetch vocabulary if we wanted to shuffle,
    // or just to reset internal state if components rely on mount.
    // For now effectively acting as a soft reload of the game logic.
    setGameKey((prev) => prev + 1);
  };

  if (isLoading || (isFetching && showStartScreen)) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/student/games">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToGames")}
          </Link>
        </Button>
        <Header
          heading={t("games.rpgBattle.title")}
          text={t("games.rpgBattle.description")}
        >
          <Swords className="text-primary h-8 w-8" />
        </Header>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Loader2 className="text-primary mb-4 h-10 w-10 animate-spin" />
            <p className="text-muted-foreground text-lg font-medium">
              {t("loadingVocabulary")}
            </p>
            <p className="text-muted-foreground text-sm">
              {t("preparingGame")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/student/games">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToGames")}
          </Link>
        </Button>
        <Header
          heading={t("games.rpgBattle.title")}
          text={t("games.rpgBattle.description")}
        >
          <Swords className="text-primary h-8 w-8" />
        </Header>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("unableToStartGame")}</AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            <p>{t("saveTip")}</p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative h-[80vh] max-h-190 min-h-80 w-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.45)] sm:min-h-100 md:min-h-120 ${gameStatus !== "idle" ? "touch-none select-none" : ""}`}
    >
      {gameStatus === "idle" && (
        <GameStartScreen
          gameTitle={t("games.rpgBattle.title")}
          gameSubtitle={t("games.rpgBattle.description")}
          vocabulary={vocabulary}
          instructions={[
            {
              step: 1,
              text: t("rpgBattle.instructions.step1Desc"),
              icon: BookOpen,
            },
            {
              step: 2,
              text: t("rpgBattle.instructions.step2Desc"),
              icon: Sparkles,
            },
            {
              step: 3,
              text: t("rpgBattle.instructions.step3Desc"),
              icon: Shield,
            },
          ]}
          proTip={t("rpgBattle.instructions.tip")}
          startButtonText={t("common.startBattle")}
          icon={BookOpen}
          selectedLanguage={selectedLanguage}
          onLanguageChange={onLanguageChange}
          showSelectionLanguage={mode === "normal"}
          onStart={() => {
            handleRestart();
            setGameStatus("playing");
          }}
        />
      )}

      {gameStatus === "playing" && (
        <BattleSelectionModal
          step={selectionStep}
          heroes={battleHeroes}
          locations={battleLocations}
          enemies={battleEnemies}
          onSelectHero={selectHero}
          onSelectLocation={selectLocation}
          onSelectEnemy={selectEnemy}
        />
      )}

      {showResults && (status === "victory" || status === "defeat") ? (
        <BattleResults
          outcome={status}
          xp={resultXp}
          accuracy={resultAccuracy}
          onRestart={() => {
            flushOnComplete();
            handleRestart();
            setGameStatus("idle");
          }}
          onExit={() => {
            flushOnComplete();
            handleRestart();
            setGameStatus("idle");
          }}
        />
      ) : gameStatus === "playing" && selectionStep === "ready" ? (
        <Card className="border-none bg-slate-900">
          <CardContent className="p-0">
            <BattleEffects
              shakeKey={shakeKey}
              flashKey={flashKey}
              flashTone={flashTone}
            >
              <BattleScene
                floatingTexts={floatingTexts}
                streak={streak}
                backgroundImage={selectedLocation?.background}
                playerHealth={
                  <HealthBar
                    current={playerHealth}
                    max={playerMaxHealth}
                    label="Hero"
                    tone="player"
                  />
                }
                enemyHealth={
                  <HealthBar
                    current={enemyHealth}
                    max={enemyMaxHealth}
                    label="Enemy"
                    tone="enemy"
                  />
                }
                player={
                  <Sprite
                    src={heroSprite}
                    pose={playerPose}
                    alt="Hero"
                    size={140}
                    flip
                  />
                }
                enemy={
                  <Sprite
                    src={enemySprite}
                    pose={enemyPose}
                    alt="Enemy"
                    size={140}
                  />
                }
                actionMenu={
                  <div className="space-y-2">
                    <ActionMenu
                      actions={menuActions}
                      value={inputValue}
                      onChange={setInputValue}
                      onSubmit={handleSubmit}
                      disabled={
                        inputLocked || turn !== "player" || status !== "playing"
                      }
                    />
                    <AnimatePresence>
                      {revealedTranslation ? (
                        <motion.p
                          key={revealedTranslation}
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          className="text-sm font-semibold text-amber-400"
                        >
                          {t("rpgBattle.correctAnswer", {
                            answer: revealedTranslation,
                          })}
                        </motion.p>
                      ) : null}
                    </AnimatePresence>
                  </div>
                }
                battleLog={<BattleLog entries={battleLog} />}
                turnIndicator={
                  <div className="text-xs text-slate-400">
                    {t("rpgBattle.turn", {
                      who:
                        turn === "player"
                          ? t("rpgBattle.player")
                          : t("rpgBattle.enemy"),
                    })}
                  </div>
                }
              />
            </BattleEffects>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
