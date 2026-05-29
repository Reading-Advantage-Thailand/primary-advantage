"use client";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { generateImages } from "@/actions/test";
import { useTransition } from "react";
import { toast } from "sonner";

/**
 * Client component that provides a UI for generating images for an article.
 * Users enter an article ID and click a button to trigger image generation.
 */
export default function GenerateImages() {
  const [articleId, setArticleId] = useState("");
  const [isPending, startTransition] = useTransition();
  return (
    <div className="flex flex-col gap-4">
      <Input
        type="text"
        value={articleId}
        id="articleId"
        onChange={(e) => setArticleId(e.target.value)}
        placeholder="Enter article ID"
      />
      <Button
        disabled={isPending}
        onClick={async () => {
          startTransition(async () => {
            const result = await generateImages(articleId);
            if (result.success) {
              toast.success(result.message);
            } else {
              toast.error(result.message);
            }
          });
        }}
      >
        Generate Images
      </Button>
    </div>
  );
}
