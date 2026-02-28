"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Sprite } from "@/components/games/vocabulary/rpg-battle/Sprite";
import {
  BASE_XP_CAP,
  scaleBattleXp,
  scaleEnemyHealth,
} from "@/lib/games/rpg-battle/rpgBattleScaling";
import {
  BattleEnemyOption,
  BattleHeroOption,
  BattleLocationOption,
} from "@/lib/games/rpg-battle/rpgBattleSelection";
import { BattleSelectionStep } from "@/store/useRPGBattleStore";

interface BattleSelectionModalProps {
  step: BattleSelectionStep;
  heroes: BattleHeroOption[];
  locations: BattleLocationOption[];
  enemies: BattleEnemyOption[];
  onSelectHero: (heroId: BattleHeroOption["id"]) => void;
  onSelectLocation: (locationId: BattleLocationOption["id"]) => void;
  onSelectEnemy: (enemyId: BattleEnemyOption["id"]) => void;
}

interface SelectionOptionButtonProps {
  label: string;
  description?: string;
  preview?: React.ReactNode;
  onSelect: () => void;
}

const formatEnemyStats = (multiplier: number) => {
  const hp = scaleEnemyHealth(multiplier);
  const xp = scaleBattleXp(BASE_XP_CAP, multiplier);
  return `HP ${hp} | XP up to ${xp}`;
};

function SelectionOptionButton({
  label,
  description,
  preview,
  onSelect,
}: SelectionOptionButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      className="h-auto w-full flex-col items-start gap-2 rounded-xl border-slate-700/50 bg-slate-800/60 px-4 py-3 text-left transition-all hover:border-slate-600 hover:bg-slate-800/80"
      onClick={onSelect}
    >
      {preview ? (
        <div className="flex w-full items-center justify-center rounded-lg bg-slate-900/60 p-2">
          {preview}
        </div>
      ) : null}
      <span className="text-sm font-semibold text-slate-100">{label}</span>
      {description ? (
        <span className="text-xs text-slate-400">{description}</span>
      ) : null}
    </Button>
  );
}

export function BattleSelectionModal({
  step,
  heroes,
  locations,
  enemies,
  onSelectHero,
  onSelectLocation,
  onSelectEnemy,
}: BattleSelectionModalProps) {
  if (step === "ready") {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-4 backdrop-blur-sm duration-200"
    >
      <Card className="animate-in zoom-in-95 w-full max-w-xl border-slate-700/50 bg-slate-900/95 shadow-2xl backdrop-blur-md duration-200">
        <CardHeader className="space-y-1 border-b border-slate-700/50">
          {step === "hero" ? (
            <>
              <h2 className="text-lg font-semibold text-slate-100">
                Choose your hero
              </h2>
              <p className="text-sm text-slate-400">Cosmetic choice only.</p>
            </>
          ) : null}
          {step === "location" ? (
            <>
              <h2 className="text-lg font-semibold text-slate-100">
                Choose a location
              </h2>
              <p className="text-sm text-slate-400">Background only.</p>
            </>
          ) : null}
          {step === "enemy" ? (
            <>
              <h2 className="text-lg font-semibold text-slate-100">
                Choose an enemy
              </h2>
              <p className="text-sm text-slate-400">
                Stronger foes grant more XP.
              </p>
            </>
          ) : null}
        </CardHeader>
        <CardContent className="pt-6">
          {step === "hero" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {heroes.map((hero) => (
                <SelectionOptionButton
                  key={hero.id}
                  label={hero.label}
                  preview={
                    <Sprite
                      src={hero.sprite}
                      pose="idle"
                      alt={`${hero.label} hero`}
                      size={72}
                    />
                  }
                  onSelect={() => onSelectHero(hero.id)}
                />
              ))}
            </div>
          ) : null}

          {step === "location" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {locations.map((location) => (
                <SelectionOptionButton
                  key={location.id}
                  label={location.label}
                  preview={
                    <div
                      role="img"
                      aria-label={location.label}
                      className="h-16 w-full rounded-md border border-slate-700/30 bg-cover bg-center"
                      style={{ backgroundImage: `url(${location.background})` }}
                    />
                  }
                  onSelect={() => onSelectLocation(location.id)}
                />
              ))}
            </div>
          ) : null}

          {step === "enemy" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {enemies.map((enemy) => (
                <SelectionOptionButton
                  key={enemy.id}
                  label={enemy.label}
                  description={formatEnemyStats(enemy.multiplier)}
                  preview={
                    <Sprite
                      src={enemy.sprite}
                      pose="idle"
                      alt={`${enemy.label} enemy`}
                      size={72}
                    />
                  }
                  onSelect={() => onSelectEnemy(enemy.id)}
                />
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
