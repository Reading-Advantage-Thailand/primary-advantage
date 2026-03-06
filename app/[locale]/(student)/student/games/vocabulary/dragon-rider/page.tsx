import Link from "next/link";
import { DragonRiderGame } from "@/components/games/vocabulary/dragon-rider/DragonRiderGame";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTranslations } from "next-intl/server";

export default async function DragonRiderPage() {
  const t = await getTranslations("games");
  return (
    <main className="min-h-screen px-2 py-2 text-white sm:px-4 sm:py-4 md:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <Button variant="ghost" size="sm" asChild className="mb-4">
          <Link href="/student/games">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToGames")}
          </Link>
        </Button>
        <DragonRiderGame />
      </div>
    </main>
  );
}
