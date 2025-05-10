import ArticleSelect from "@/components/articles/article-select";
import { Header } from "@/components/header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import React from "react";
import genreDataJson from "@/data/genres.json";
import Link from "next/link";
import { getArticles } from "@/server/controllers/articleController";
import { cleanGenre, cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

interface PageProps {
  searchParams: {
    type?: string;
    genre?: string;
    subgenre?: string;
  };
}

export interface GenreItem {
  name: string;
  subgenres: string[];
}

export type GenreData = {
  [type: string]: GenreItem[];
};

const genreData = genreDataJson as GenreData;

export default async function ReadPage({ searchParams }: PageProps) {
  const { type, genre, subgenre } = await searchParams;

  const initialData = await getArticles(
    new URLSearchParams({
      ...(type ? { type } : {}),
      ...(genre ? { genre } : {}),
      ...(subgenre ? { subgenre } : {}),
      limit: "10",
      offset: "0",
    })
  );

  return (
    <>
      <Header heading="Article Selection" />
      <Card className="my-2">
        <CardHeader>
          <CardTitle>Article Selection</CardTitle>
          <CardDescription>
            Select an article to read and practice your reading skills.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Type selection */}
          <div className="space-x-2 space-y-2">
            {!type &&
              Object.keys(genreData).map((t) => (
                <Link
                  key={t}
                  href={`/student/read?type=${t}`}
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "capitalize"
                  )}
                  scroll={false} // Optional: prevents page scroll
                  replace={false} // Forces a re-navigation
                >
                  {t}
                </Link>
              ))}
          </div>

          {/* Genre selection */}
          {type && !genre && (
            <div className="space-x-2 space-y-2">
              {genreData[type].map((g) => (
                <Link
                  key={g.name}
                  href={`/student/read?type=${type}&genre=${cleanGenre(
                    g.name
                  )}`}
                  className={cn(
                    buttonVariants({ variant: "default" }),
                    "capitalize"
                  )}
                  scroll={false} // Optional: prevents page scroll
                  replace={false} // Forces a re-navigation
                >
                  {cleanGenre(g.name)}
                </Link>
              ))}
            </div>
          )}

          {/* Subgenre selection */}
          {type && genre && !subgenre && (
            <div className="space-x-2 space-y-2">
              {genreData[type]
                .find((g) => cleanGenre(g.name) === cleanGenre(genre))
                ?.subgenres.map((sub) => (
                  <Link
                    key={sub}
                    href={`/student/read?type=${type}&genre=${genre}&subgenre=${cleanGenre(
                      sub
                    )}`}
                    className={cn(
                      buttonVariants({ variant: "default" }),
                      "capitalize"
                    )}
                    scroll={false} // Optional: prevents page scroll
                    replace={false} // Forces a re-navigation
                  >
                    {cleanGenre(sub)}
                  </Link>
                ))}
            </div>
          )}

          <ArticleSelect
            initialArticles={initialData.articles}
            total={initialData.totalArticles}
          />
        </CardContent>
      </Card>
    </>
  );
}
