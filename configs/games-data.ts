import { Flame, Shield, Sword, Puzzle, Zap } from "lucide-react";
import type { useTranslations } from "next-intl";

type TranslationFunction = ReturnType<typeof useTranslations<"GamesPage">>;

export function getGamesList(t: TranslationFunction) {
  return [
    {
      id: "rpg-battle",
      title: t("games.rpgBattle.title"),
      description: t("games.rpgBattle.description"),
      icon: Sword,
      coverImage: "/games/cover/rpg-battle.png",
      color: "from-red-500 via-orange-500 to-amber-500",
      difficultyKey: "medium" as const,
      difficulty: t("difficulty.medium"),
      type: t("types.vocabulary"),
      badge: t("badges.popular"),
      badgeVariant: "default" as const,
    },
    {
      id: "rune-match",
      title: t("games.runeMatch.title"),
      description: t("games.runeMatch.description"),
      icon: Puzzle,
      coverImage: "/games/cover/rune-match.png",
      color: "from-green-500 via-emerald-500 to-teal-500",
      difficultyKey: "easy" as const,
      difficulty: t("difficulty.easy"),
      type: t("types.matching"),
      badge: null,
      badgeVariant: "outline" as const,
    },
  ];
}
