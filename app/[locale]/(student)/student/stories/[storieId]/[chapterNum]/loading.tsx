import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function ChapterLoadingSkeleton() {
  return (
    <div className="flex flex-col gap-4 xl:flex-row">
      <div className="flex flex-col gap-4 xl:basis-3/5">
        {/* Back button skeleton */}
        <Skeleton className="h-10 w-48" />

        {/* Main content card */}
        <Card>
          <CardHeader className="space-y-4">
            {/* Title */}
            <Skeleton className="h-10 w-3/4" />
            {/* Badges */}
            <div className="flex gap-2">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-6 w-16" />
            </div>
            {/* Summary */}
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Listen button */}
            <Skeleton className="h-14 w-full rounded-2xl" />

            {/* Image */}
            <Skeleton className="aspect-video w-full rounded-xl" />

            {/* Passage */}
            <div className="space-y-3 rounded-xl bg-amber-50/50 p-6 dark:bg-amber-950/20">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between">
              <Skeleton className="h-12 w-32 rounded-xl" />
              <Skeleton className="h-12 w-32 rounded-xl" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar */}
      <div className="flex flex-col gap-4 xl:basis-2/5">
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-36" />
          </CardHeader>
          <CardContent className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
