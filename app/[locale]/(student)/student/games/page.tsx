import { Header } from "@/components/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Image from "next/image";
import { Gamepad2, Sparkles, Trophy, Star, Clock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { getGamesList } from "@/configs/games-data";
import { Link } from "@/i18n/navigation";

const difficultyColors = {
  easy: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
  medium:
    "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20",
  hard: "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20",
};

const ComingSoonCard = async () => {
  const t = await getTranslations("games");
  return (
    <div className="h-full">
      <Card className="group border-muted-foreground/30 bg-muted/30 relative flex h-full flex-col overflow-hidden border-2 border-dashed opacity-60 backdrop-blur-sm">
        <CardHeader className="relative -mt-6 flex h-48 shrink-0 items-center justify-center bg-linear-to-br from-gray-400 via-gray-500 to-gray-600 pb-8 text-white">
          {/* Animated background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-[radial-linear(circle_at_50%_120%,rgba(255,255,255,0.3),transparent)]" />
          </div>

          <div className="relative z-10 flex w-full items-center justify-center">
            <div className="transform transition-all duration-300">
              <Clock className="h-16 w-16 animate-pulse drop-shadow-lg" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-1 flex-col space-y-4 pt-6 pb-4">
          <div className="flex-1 text-center">
            <CardTitle className="text-muted-foreground mb-2 text-2xl font-bold">
              {t("comingSoon")}
            </CardTitle>
            <CardDescription className="text-base leading-relaxed">
              {t("comingSoonDescription")}
            </CardDescription>
          </div>

          {/* Placeholder badges */}
          <div className="mt-auto flex flex-wrap justify-center gap-2">
            <Badge variant="outline" className="font-medium opacity-50">
              {t("newGames")}
            </Badge>
          </div>
        </CardContent>

        <CardFooter className="mt-auto pt-0 pb-6">
          <Button
            disabled
            className="h-11 w-full cursor-not-allowed text-base font-semibold"
          >
            <Clock className="mr-2 h-4 w-4" />
            {t("comingSoon")}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default async function GamesPage() {
  const t = await getTranslations("games");
  const games = getGamesList(t);
  const sentenceGames: any[] = [];
  const vocabularyGames = games;

  return (
    <>
      <div className="mx-auto mt-8 max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-12">
          {/* Vocabulary Games Section */}
          <section>
            <div className="mb-6">
              <h2 className="mb-2 text-3xl font-bold">
                {t("sections.vocabulary")}
              </h2>
              <p className="text-muted-foreground">
                {t("sections.vocabularyDescription")}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <TooltipProvider>
                {vocabularyGames.map((game) => {
                  const Icon = game.icon;
                  return (
                    <div key={game.id} className="h-full">
                      <Card className="group hover:shadow-primary/20 hover:border-primary/50 bg-card/50 relative flex h-full cursor-pointer flex-col overflow-hidden border-2 backdrop-blur-sm transition-all duration-300 hover:z-30 hover:-translate-y-1 hover:shadow-2xl">
                        {/* Badge overlay */}
                        {game.badge && (
                          <div className="absolute top-4 right-4 z-10">
                            <Badge
                              variant={game.badgeVariant}
                              className="font-semibold shadow-lg"
                            >
                              {game.badge === t("badges.popular") && (
                                <Trophy className="mr-1 h-3 w-3" />
                              )}
                              {game.badge === t("badges.new") && (
                                <Sparkles className="mr-1 h-3 w-3" />
                              )}
                              {game.badge === t("badges.recommended") && (
                                <Star className="mr-1 h-3 w-3" />
                              )}
                              {game.badge}
                            </Badge>
                          </div>
                        )}

                        <CardHeader className="relative -mt-6 shrink-0 overflow-hidden p-0">
                          {/* Cover Image */}
                          <div className="relative h-48 w-full overflow-hidden transition-all duration-300 group-hover:h-56">
                            <Image
                              src={game.coverImage}
                              alt={game.title}
                              fill
                              className="object-cover transition-all duration-300 group-hover:scale-105"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                            {/* Gradient overlay for better text readability */}
                            <div
                              className={`absolute inset-0 bg-linear-to-t ${game.color} opacity-40 transition-opacity duration-300 group-hover:opacity-10`}
                            />
                          </div>

                          {/* Game icon overlay */}
                          <div className="absolute bottom-4 left-4 z-10">
                            <div className="transform rounded-xl bg-white/90 p-3 shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 dark:bg-gray-900/90">
                              <Icon className="text-primary h-10 w-10" />
                            </div>
                          </div>

                          {/* Gamepad icon */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="absolute right-4 bottom-4 z-10 transform rounded-lg bg-white/90 p-2 shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:-rotate-12 dark:bg-gray-900/90">
                                <Gamepad2 className="text-primary h-6 w-6" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("clickToPlay")}</p>
                            </TooltipContent>
                          </Tooltip>
                        </CardHeader>

                        <CardContent className="flex flex-1 flex-col space-y-4 pt-6 pb-4">
                          <div className="flex-1">
                            <CardTitle className="group-hover:text-primary mb-2 line-clamp-1 text-2xl font-bold transition-colors">
                              {game.title}
                            </CardTitle>
                            <CardDescription className="line-clamp-3 text-base leading-relaxed">
                              {game.description}
                            </CardDescription>
                          </div>

                          {/* Game info badges */}
                          <div className="mt-auto flex flex-wrap gap-2 pt-2">
                            <Badge
                              variant="outline"
                              className={`${
                                difficultyColors[
                                  game.difficulty as keyof typeof difficultyColors
                                ]
                              } font-medium`}
                            >
                              {game.difficulty}
                            </Badge>
                            <Badge variant="outline" className="font-medium">
                              {game.type}
                            </Badge>
                          </div>
                        </CardContent>

                        <CardFooter className="mt-auto pt-0 pb-6">
                          <Button className="h-11 w-full text-base font-semibold shadow-md transition-all duration-300 group-hover:scale-[1.02] hover:shadow-lg">
                            <Link
                              href={`/student/games/vocabulary/${game.id}`}
                              className="flex items-center justify-center"
                            >
                              <Gamepad2 className="mr-2 h-4 w-4" />
                              {t("playNow")}
                            </Link>
                          </Button>
                        </CardFooter>

                        {/* Hover glow effect */}
                        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          <div
                            className={`absolute inset-0 bg-linear-to-br ${game.color} opacity-5 blur-xl`}
                          />
                        </div>
                      </Card>
                    </div>
                  );
                })}

                {/* Coming Soon Card */}
                <ComingSoonCard />
              </TooltipProvider>
            </div>
          </section>

          {/* Sentence Games Section */}
          <section>
            <div className="mb-6">
              <h2 className="mb-2 text-3xl font-bold">
                {t("sections.sentence")}
              </h2>
              <p className="text-muted-foreground">
                {t("sections.sentenceDescription")}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <TooltipProvider>
                {sentenceGames.map((game) => {
                  const Icon = game.icon;
                  return (
                    <div key={game.id} className="h-full">
                      <Card
                        className="group hover:shadow-primary/20 hover:border-primary/50 bg-card/50 relative flex h-full cursor-pointer flex-col overflow-hidden border-2 backdrop-blur-sm transition-all duration-300 hover:z-30 hover:-translate-y-1 hover:shadow-2xl"
                        // onClick={() => router.push(`/student/games/${game.id}`)}
                      >
                        {/* Badge overlay */}
                        {game.badge && (
                          <div className="absolute top-4 right-4 z-10">
                            <Badge
                              variant={game.badgeVariant}
                              className="font-semibold shadow-lg"
                            >
                              {game.badge === t("badges.popular") && (
                                <Trophy className="mr-1 h-3 w-3" />
                              )}
                              {game.badge === t("badges.new") && (
                                <Sparkles className="mr-1 h-3 w-3" />
                              )}
                              {game.badge === t("badges.recommended") && (
                                <Star className="mr-1 h-3 w-3" />
                              )}
                              {game.badge}
                            </Badge>
                          </div>
                        )}

                        <CardHeader className="relative -mt-6 shrink-0 overflow-hidden p-0">
                          {/* Cover Image */}
                          <div className="relative h-48 w-full overflow-hidden transition-all duration-300 group-hover:h-56">
                            <Image
                              src={game.coverImage}
                              alt={game.title}
                              fill
                              className="object-cover transition-all duration-300 group-hover:scale-105"
                              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            />
                            {/* linear overlay for better text readability */}
                            <div
                              className={`absolute inset-0 bg-linear-to-t ${game.color} opacity-40 transition-opacity duration-300 group-hover:opacity-10`}
                            />
                          </div>

                          {/* Game icon overlay */}
                          <div className="absolute bottom-4 left-4 z-10">
                            <div className="transform rounded-xl bg-white/90 p-3 shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 dark:bg-gray-900/90">
                              <Icon className="text-primary h-10 w-10" />
                            </div>
                          </div>

                          {/* Gamepad icon */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="absolute right-4 bottom-4 z-10 transform rounded-lg bg-white/90 p-2 shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:-rotate-12 dark:bg-gray-900/90">
                                <Gamepad2 className="text-primary h-6 w-6" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("clickToPlay")}</p>
                            </TooltipContent>
                          </Tooltip>
                        </CardHeader>

                        <CardContent className="flex flex-1 flex-col space-y-4 pt-6 pb-4">
                          <div className="flex-1">
                            <CardTitle className="group-hover:text-primary mb-2 line-clamp-1 text-2xl font-bold transition-colors">
                              {game.title}
                            </CardTitle>
                            <CardDescription className="line-clamp-3 text-base leading-relaxed">
                              {game.description}
                            </CardDescription>
                          </div>

                          {/* Game info badges */}
                          <div className="mt-auto flex flex-wrap gap-2 pt-2">
                            <Badge
                              variant="outline"
                              className={`${
                                difficultyColors[
                                  game.difficulty as keyof typeof difficultyColors
                                ]
                              } font-medium`}
                            >
                              {game.difficulty}
                            </Badge>
                            <Badge variant="outline" className="font-medium">
                              {game.type}
                            </Badge>
                          </div>
                        </CardContent>

                        <CardFooter className="mt-auto pt-0 pb-6">
                          <Button className="h-11 w-full text-base font-semibold shadow-md transition-all duration-300 group-hover:scale-[1.02] hover:shadow-lg">
                            <Link
                              href={`/student/games/sentences/${game.id}`}
                              className="flex items-center justify-center"
                            >
                              <Gamepad2 className="mr-2 h-4 w-4" />
                              {t("playNow")}
                            </Link>
                          </Button>
                        </CardFooter>

                        {/* Hover glow effect */}
                        <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                          <div
                            className={`absolute inset-0 bg-linear-to-br ${game.color} opacity-5 blur-xl`}
                          />
                        </div>
                      </Card>
                    </div>
                  );
                })}

                {/* Coming Soon Card */}
                <ComingSoonCard />
              </TooltipProvider>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
