"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateArticle } from "@/actions/article";
import React, { useState, useTransition } from "react";
import { toast } from "sonner";

export default function ArticleTestGenerate() {
  const [amount, setAmount] = useState(1);
  const [isPending, startTransition] = useTransition();

  const handleGenerate = async () => {
    startTransition(async () => {
      generateArticle(amount).then((result) => {
        if (result.failed > 0) {
          toast.error(`Generation completed with ${result.failed} failure(s)`);
        } else {
          toast.success(
            `Articles generated successfully (${result.succeeded}/${result.total})`,
          );
        }
      });
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <h1>Generate Articles</h1>
      <Input
        type="number"
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        placeholder="Enter amount"
      />
      <Button onClick={handleGenerate} disabled={isPending}>
        Generate
      </Button>
    </div>
  );
}
