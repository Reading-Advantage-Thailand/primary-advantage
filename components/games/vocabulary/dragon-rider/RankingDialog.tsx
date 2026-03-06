import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Medal, Crown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

export type Difficulty = "easy" | "normal" | "hard" | "extreme";

type RankingEntry = {
  userId: string;
  name: string;
  image: string | null;
  xp: number;
};

type RankingData = Record<string, RankingEntry[]>;

interface RankingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiEndpoint?: string;
  difficulties?: Difficulty[];
  title?: string;
  roleLabel?: string;
  emptyStateMessage?: string;
  emptyStateSubMessage?: string;
  translationNamespace?: "dragonFlight" | "castleDefense" | string;
}

export function RankingDialog({
  open,
  onOpenChange,
  apiEndpoint = "/api/games/dragon-flight/ranking",
  difficulties = ["easy", "normal", "hard", "extreme"],
  title,
  roleLabel,
  emptyStateMessage,
  emptyStateSubMessage,
  translationNamespace = "dragonFlight",
}: RankingDialogProps) {
  const t = useTranslations("games");
  const [data, setData] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchRankings();
    }
  }, [open]);

  const fetchRankings = async () => {
    try {
      setLoading(true);
      const res = await fetch(apiEndpoint);
      if (res.ok) {
        const json = await res.json();
        setData(json.rankings);
      }
    } catch (error) {
      console.error("Failed to fetch rankings", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="h-5 w-5 text-yellow-400" />;
    if (index === 1) return <Medal className="h-5 w-5 text-slate-300" />;
    if (index === 2) return <Medal className="h-5 w-5 text-amber-600" />;
    return (
      <span className="text-sm font-bold text-white/50">#{index + 1}</span>
    );
  };

  const difficultiesList = difficulties;

  const DifficultyTab = ({ diff }: { diff: Difficulty }) => {
    const rankings = data?.[diff] || [];

    if (loading) {
      return (
        <div className="flex flex-col gap-3 py-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-center gap-4 rounded-lg bg-white/5 p-3"
            >
              <div className="h-8 w-8 animate-pulse rounded-full bg-white/10" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
                <div className="h-3 w-16 animate-pulse rounded bg-white/5" />
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (rankings.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center text-white/40">
          <Trophy className="mb-2 h-12 w-12 opacity-20" />
          <p>
            {emptyStateMessage ||
              t(`${translationNamespace}.ranking.noChampions` as any)}
          </p>
          <p className="text-xs">
            {emptyStateSubMessage ||
              t(`${translationNamespace}.ranking.beTheFirst` as any)}
          </p>
        </div>
      );
    }

    return (
      <ScrollArea className="h-100 pr-4">
        <div className="flex flex-col gap-2">
          {rankings.map((user, index) => (
            <div
              key={user.userId}
              className={cn(
                "flex items-center gap-4 rounded-xl border p-3 transition-colors",
                index === 0
                  ? "border-yellow-500/30 bg-yellow-500/10"
                  : "border-white/5 bg-white/5 hover:bg-white/10",
              )}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                {getRankIcon(index)}
              </div>

              <Avatar className="h-10 w-10 border border-white/10">
                <AvatarImage src={user.image || undefined} />
                <AvatarFallback className="bg-slate-800 text-xs text-white">
                  {user.name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-white">
                  {user.name}
                </div>
                <div className="text-xs text-white/50">
                  {roleLabel ||
                    t(`${translationNamespace}.ranking.dragonRider` as any)}
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-bold text-emerald-400">
                  {user.xp.toLocaleString()} XP
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-slate-950 text-white sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Trophy className="h-5 w-5 text-yellow-500" />
            {title || t(`${translationNamespace}.ranking.leaderboard` as any)}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="normal" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-white/5">
            {difficultiesList.map((diff) => (
              <TabsTrigger
                key={diff}
                value={diff}
                className="text-[10px] text-white/50 uppercase data-[state=active]:bg-white/10 data-[state=active]:text-white"
              >
                {/* Fallback to generic labels if needed, but reusing dragonFlight keys for now is checking existing i18n structure */}
                {t(`${translationNamespace}.difficulty.${diff}` as any)}
              </TabsTrigger>
            ))}
          </TabsList>

          {difficultiesList.map((diff) => (
            <TabsContent key={diff} value={diff} className="mt-4">
              <DifficultyTab diff={diff} />
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
