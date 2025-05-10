"use client";
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { useRouter, useSearchParams } from "next/navigation";
import { Skeleton } from "../ui/skeleton";
import ArticleShowcaseCard from "./article-showcase-card";
import { set } from "zod";
// import { useScopedI18n } from "@/locales/client";
// import { articleShowcaseType } from "@/types";
// import { useCurrentLocale } from "@/locales/client";
interface Article {
  id: string;
  title: string;
  type: string;
  genre: string;
  subGenre: string;
}

// type Props = {
//   user: {
//     level: number;
//     name: string;
//     id: string;
//   };
// };

// async function fetchArticles(params: string) {
//   const response = await fetch(
//     `${process.env.NEXT_PUBLIC_BASE_URL}/api/v1/articles?${params}`
//   );

//   const data = await response.json();
//   //console.log("API Response:", response);
//   return data;
// }

export default function ArticleSelect({
  initialArticles,
  total,
}: {
  initialArticles: Article[];
  total: number;
}) {
  //   const t = useScopedI18n("components.select");
  //   const ta = useScopedI18n("components.article");
  //   const locale = useCurrentLocale();
  //   const tf: string | any = useScopedI18n("selectType.types");
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = React.useState(false);
  const [articleTypesData, setArticleTypesData] = React.useState<string[]>([]);
  //   const [articleShowcaseData, setArticleShowcaseData] = React.useState<
  //     articleShowcaseType[]
  //   >([]);
  const [articles, setArticles] = React.useState(initialArticles);
  const [page, setPage] = React.useState(1);
  const observer = React.useRef<IntersectionObserver | null>(null);
  const observerRef = React.useRef<HTMLDivElement>(null);

  const selectedType = searchParams.get("type");
  const selectedGenre = searchParams.get("genre");
  const selectedSubgenre = searchParams.get("subgenre");

  //   function getArticleType() {
  //     if (!selectedType && !selectedGenre && !selectedSubgenre) return "type";
  //     if (selectedType && !selectedGenre && !selectedSubgenre) return "genre";
  //     if (selectedType && selectedGenre && !selectedSubgenre) return "subGenre";
  //     return "article";
  //   }

  //   async function handleButtonClick(value: string) {
  //     const params = new URLSearchParams(searchParams.toString());
  //     //console.log(params.toString());
  //     if (!selectedType && !selectedGenre && !selectedSubgenre) {
  //       params.set("type", value);
  //     }
  //     if (selectedType && !selectedGenre && !selectedSubgenre) {
  //       params.set("genre", value);
  //     }
  //     if (selectedType && selectedGenre && !selectedSubgenre) {
  //       params.set("subgenre", value);
  //     }
  //     router.push("?" + params.toString());
  //   }

  // React.useEffect(() => {
  //   setArticleTypesData(["fiction", "nonfiction"]);
  //   setPage(1);
  // }, [searchParams]);

  //   React.useEffect(() => {
  //     async function fetchData() {
  //       setLoading(true);

  //       const params = new URLSearchParams(searchParams.toString());
  //       params.set("page", page.toString());
  //       params.set("limit", "10");

  //       const response = await fetchArticles(params.toString());
  //       //console.log("API Response:", response);

  //       if (response.results.length === 0 && page === 1) {
  //         router.push("?");
  //       }

  //       setArticleShowcaseData((prev) =>
  //         page === 1 ? response.results : [...prev, ...response.results]
  //       );

  //       setArticleTypesData(response.selectionType);
  //       setLoading(false);
  //     }

  //     fetchData();
  //   }, [searchParams, page, router]);

  // const lastArticleRef = React.useCallback(
  //   (node: HTMLDivElement | null) => {
  //     if (loading) return;
  //     if (observer.current) observer.current.disconnect();

  //     observer.current = new IntersectionObserver((entries) => {
  //       if (entries[0].isIntersecting) {
  //         setPage((prevPage) => prevPage + 1);
  //       }
  //     });

  //     if (node) observer.current.observe(node);
  //   },
  //   [loading]
  // );

  const loadMore = async () => {
    if (loading || articles.length >= total) return;
    setLoading(true);

    const params = new URLSearchParams({
      limit: "10",
      offset: String(page * 10),
      ...(selectedType ? { selectedType } : {}),
      ...(selectedGenre ? { selectedGenre } : {}),
      ...(selectedSubgenre ? { selectedSubgenre } : {}),
    });

    const res = await fetch(`/api/articles?${params.toString()}`);
    const data = await res.json();

    setArticles((prev) => [...prev, ...data.articles]);
    setPage((p) => p + 1);
    setLoading(false);
  };

  // Setup intersection observer
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { threshold: 1 }
    );

    if (observerRef.current) observer.observe(observerRef.current);
    return () => {
      if (observerRef.current) observer.unobserve(observerRef.current);
    };
  }, [observerRef.current]);

  React.useEffect(() => {
    setArticles(initialArticles);
  }, [initialArticles]);

  // React.useEffect(() => {
  //   const fetchData = async () => {
  //     setLoading(true);
  //     const params = new URLSearchParams(searchParams.toString());
  //     params.set("page", page.toString());
  //     params.set("limit", "10");

  //     const response = await fetch(`/api/articles?${params.toString()}`);
  //     const data = await response.json();

  //     if (data.length === 0 && page === 1) {
  //       router.push("?");
  //     }

  //     setArticles((prev) =>
  //       page === 1 ? data.results : [...prev, ...data.results]
  //     );

  //     setLoading(false);
  //   };
  //   fetchData();
  // }, [searchParams]);

  return (
    <div className="space-y-4">
      {/* {articles.map((article) => (
        <div key={article.id} className="border p-4 rounded">
          <h3 className="font-semibold">{article.title}</h3>
          <p className="text-sm text-gray-500">
            {article.type} | {article.genre} | {article.subGenre}
          </p>
        </div>
      ))} */}

      <div className="grid sm:grid-cols-2 grid-flow-row gap-4 mt-4">
        {articles.map((article, index) => (
          <ArticleShowcaseCard key={index} article={article} />
        ))}
      </div>

      {articles.length < total && (
        <div ref={observerRef} className="text-center py-4 text-gray-500">
          {loading ? "Loading more..." : "Scroll down to load more"}
        </div>
      )}
    </div>
    // <Card id="onborda-articles" className="my-2">
    //   <CardHeader>
    //     <CardTitle>
    //       {/* {t("articleChoose", {
    //         article: <b>{ta(getArticleType())}</b>,
    //       })} */}
    //       Please choose the you want to read
    //     </CardTitle>
    //     <CardDescription>
    //       {/* {t("articleChooseDescription", {
    //         level: <b>{user.level}</b>,
    //         article: <b>{ta(getArticleType())}</b>,
    //       })} */}
    //       Your level is and here are the s that you can choose.
    //     </CardDescription>
    //   </CardHeader>
    //   <CardContent>
    //     {loading && page === 1 ? (
    //       <div className="grid sm:grid-cols-2 grid-flow-row gap-4 mt-4">
    //         {Array.from({ length: 6 }).map((_, index) => (
    //           <Skeleton key={index} className="h-80 w-full" />
    //         ))}
    //       </div>
    //     ) : selectedType && selectedGenre && selectedSubgenre ? (
    //       <div className="grid sm:grid-cols-2 grid-flow-row gap-4 mt-4">
    //         {/* {articleShowcaseData.map((article, index) => (
    //           <ArticleShowcaseCard
    //             key={index}
    //             article={article}
    //             userId={user.id}
    //           />
    //         ))} */}
    //       </div>
    //     ) : (
    //       <>
    //         <div className="flex flex-wrap gap-2">
    //           {articleTypesData.map((type, index) => {
    //             return (
    //               <Button
    //                 key={index}
    //                 // onClick={() => handleButtonClick(type)}
    //                 disabled={loading}
    //               >
    //                 {type}
    //               </Button>
    //             );
    //           })}
    //         </div>
    //         <div className="grid sm:grid-cols-2 grid-flow-row gap-4 mt-4">
    //           {/* {articleShowcaseData.map((article, index) => {
    //             const isLastArticle = index === articleShowcaseData.length - 1;
    //             return (
    //               <ArticleShowcaseCard
    //                 ref={isLastArticle ? lastArticleRef : null}
    //                 key={article.id}
    //                 article={article}
    //                 userId={user.id}
    //               />
    //             );
    //           })} */}
    //         </div>
    //       </>
    //     )}
    //   </CardContent>
    // </Card>
  );
}
