import { DragonRiderGame } from "@/components/games/vocabulary/dragon-rider/DragonRiderGame";
import { getTranslations } from "next-intl/server";

export default async function DragonRiderPage() {
  const t = await getTranslations("games");
  return (
    <main className="min-h-screen p-2 text-white sm:px-4 sm:py-4 md:px-6">
      <DragonRiderGame />
    </main>
  );
}
