"use client";

import React from "react";
import {
  RUNE_MATCH_CONFIG,
  type MonsterType,
} from "@/lib/games/rune-match/runeMatchConfig";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Swords, Trophy, Heart } from "lucide-react";
import { withBasePath } from "@/lib/games/basePath";
import { useTranslations } from "next-intl";

type MonsterSelectionProps = {
  onSelect: (monster: MonsterType) => void;
};

const MONSTER_METADATA: Record<
  MonsterType,
  { label: string; color: string; description: string; image: string }
> = {
  goblin: {
    label: "Goblin",
    color: "bg-green-900/50 text-green-400 border-green-500/30",
    description: "Weak but fast.",
    image: "/games/rune-match/monsters/goblin_3x4_pose_sheet.png",
  },
  skeleton: {
    label: "Skeleton",
    color: "bg-slate-800/50 text-slate-300 border-slate-500/30",
    description: "Restless undead.",
    image: "/games/rune-match/monsters/skeleton_3x4_pose_sheet.png",
  },
  orc: {
    label: "Orc",
    color: "bg-red-900/50 text-red-400 border-red-500/30",
    description: "A fierce warrior.",
    image: "/games/rune-match/monsters/orc_3x4_pose_sheet.png",
  },
  dragon: {
    label: "Dragon",
    color: "bg-amber-900/50 text-amber-400 border-amber-500/30",
    description: "The ultimate challenge.",
    image: "/games/rune-match/monsters/dragon_3x4_pose_sheet.png",
  },
};

const handleMobileClick =
  (type: MonsterType, onSelect: (monster: MonsterType) => void) => async () => {
    if (window.innerWidth >= 1280) return;
    onSelect(type);
  };

export function MonsterSelection({ onSelect }: MonsterSelectionProps) {
  const t = useTranslations("games.runeMatch");
  const monsterTypes: MonsterType[] = ["goblin", "skeleton", "orc", "dragon"];

  return (
    <div className="animate-in fade-in zoom-in mx-auto flex w-full max-w-5xl flex-col items-start justify-start space-y-8 p-6 duration-300">
      <div className="w-full text-center md:space-y-2">
        <h2 className="text-xl font-bold tracking-tight text-white md:text-2xl xl:text-3xl">
          {t("selectMonster")}
        </h2>
        <p className="text-slate-400">{t("selectMonsterDesc")}</p>
      </div>

      <div className="grid w-full grid-cols-2 gap-4 md:grid-cols-4">
        {monsterTypes.map((type) => {
          const config = RUNE_MATCH_CONFIG.monsters[type];
          const meta = MONSTER_METADATA[type];
          return (
            <Card
              key={type}
              className={`border-2 bg-slate-900/50 transition-all hover:scale-105 ${meta.color} group overflow-hidden hover:border-current`}
              onClick={handleMobileClick(type, onSelect)}
            >
              <div className="relative flex w-full items-center justify-center overflow-hidden xl:h-32">
                <div
                  className="h-14 w-14 transition-transform duration-500 group-hover:scale-110 xl:h-24 xl:w-24"
                  style={{
                    backgroundImage: `url(${withBasePath(meta.image)})`,
                    backgroundSize: "300% 400%",
                    backgroundPosition: "0 0",
                    imageRendering: "pixelated",
                  }}
                />
              </div>
              <CardHeader className="-m-4 xl:m-0 xl:pb-4">
                <CardTitle className="text-center text-xl">
                  {t(`monsters.${type}`)}
                </CardTitle>
                <p className="hidden text-center text-xs opacity-70 xl:block">
                  {t(`monsters.${type}Description`)}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      <span className="hidden xl:inline">{t("hp")}</span>
                    </span>
                    <span className="font-bold">{config.hp} HP</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Swords className="h-4 w-4" />
                      <span className="hidden xl:inline">{t("attack")}</span>
                    </span>
                    <span className="font-bold">1-{config.attack}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      <span className="hidden xl:inline">{t("reward")}</span>
                    </span>
                    <span className="font-bold text-yellow-500">
                      {config.xp} XP
                    </span>
                  </div>
                </div>
                <Button
                  onClick={() => onSelect(type)}
                  variant="outline"
                  className="hidden w-full border-none bg-white/10 transition-colors hover:bg-white hover:text-black xl:inline"
                >
                  {t("battleButton")}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {/* <div className="h-24 w-full" /> */}
    </div>
  );
}
