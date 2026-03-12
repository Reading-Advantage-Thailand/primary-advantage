import { Flame, Shield, Sword, Puzzle, Zap, Sparkles } from "lucide-react";
import type { useTranslations } from "next-intl";

type TranslationFunction = ReturnType<typeof useTranslations<"GamesPage">>;

export function getGamesList(t: TranslationFunction) {
  return {
    vocabulary: [
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
      {
        id: "dragon-rider",
        title: t("games.dragonRider.title"),
        description: t("games.dragonRider.description"),
        icon: Flame,
        coverImage: "/games/cover/dragon-rider.png",
        color: "from-purple-500 via-pink-500 to-rose-500",
        difficultyKey: "medium" as const,
        difficulty: t("difficulty.medium"),
        type: t("types.strategy"),
        badge: t("badges.popular"),
        badgeVariant: "default" as const,
      },
    ],
    sentence: [
      {
        id: "potion-rush",
        title: t("games.potionRush.title"),
        description: t("games.potionRush.description"),
        icon: Sparkles,
        coverImage: "/games/cover/potion-rush.png",
        color: "from-indigo-500 via-purple-500 to-pink-500",
        difficultyKey: "medium" as const,
        difficulty: t("difficulty.medium"),
        type: t("types.sentence"),
        badge: t("badges.new"),
        badgeVariant: "secondary" as const,
      },
    ],
  };
}
