import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function LessonLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <Skeleton className="h-10 w-3/4" />
      <Card>
        <CardContent className="space-y-4 pt-6">
          <Skeleton className="h-70 w-full rounded-xl" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-5/6" />
          <Skeleton className="h-5 w-4/6" />
        </CardContent>
      </Card>
      <div className="flex justify-end gap-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}
