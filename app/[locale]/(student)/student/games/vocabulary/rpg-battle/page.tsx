import { ChevronLeft, Swords } from "lucide-react";
import RPGBattle from "@/components/games/vocabulary/rpg-battle/RPGBattle";
import { Header } from "@/components/header";
import { Button } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import StartScreenRPGBattle from "@/components/games/vocabulary/rpg-battle/StartScreenRPGBattle";

export default async function RpgBattlePage() {
  const t = await getTranslations("games");

  return (
    // <div className="space-y-6">
    //   <Button variant="ghost" size="sm" asChild>
    //     <Link href="/student/games">
    //       <ChevronLeft className="mr-1 h-4 w-4" />
    //       {t("backToGames")}
    //     </Link>
    //   </Button>
    //   <Header
    //     heading={t("games.rpgBattle.title")}
    //     text={t("games.rpgBattle.description")}
    //   >
    //     <Swords className="text-primary h-8 w-8" />
    //   </Header>

    //   <RPGBattle />
    // </div>
    <main className="min-h-screen p-2 text-white sm:px-4 sm:py-4 md:px-6">
      <StartScreenRPGBattle />
    </main>
  );
}
