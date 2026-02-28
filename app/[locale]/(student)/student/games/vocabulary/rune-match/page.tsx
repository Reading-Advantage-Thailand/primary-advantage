import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { ChevronLeft, Swords } from "lucide-react";
import { StartScreen } from "@/components/games/vocabulary/rune-match/StartScreen";
import { getTranslations } from "next-intl/server";

export default async function RuneMatchPage() {
  const t = await getTranslations("games");

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/student/games">
          <ChevronLeft className="mr-1 h-4 w-4" />
          {t("backToGames")}
        </Link>
      </Button>

      <Header
        heading={t("games.runeMatch.title")}
        text={t("games.runeMatch.description")}
      >
        <Swords className="text-primary h-8 w-8" />
      </Header>

      <StartScreen />
    </div>
  );
}
