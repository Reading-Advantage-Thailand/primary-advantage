"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { translateAndStoreSentencesForStory } from "@/actions/test";

export default function TranslateTest() {
    const [articleId, setArticleId] = useState("");
    const [isPending, startTransition] = useTransition();
    return (
        <div className="flex flex-col gap-4">
            <h1>Translate Test</h1>
            <Input
                placeholder="Article ID"
                value={articleId}
                onChange={(e) => setArticleId(e.target.value)}
            />
            <Button
                disabled={isPending}
                onClick={async () => {
                    startTransition(async () => {
                        await translateAndStoreSentencesForStory(articleId);
                    });
                }}
            >
                Translate And Store Sentences For Story
            </Button>
        </div>
    );
}