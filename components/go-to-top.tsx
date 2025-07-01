"use client";

import { ArrowUp } from "lucide-react";
import { buttonVariants } from "./ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function GoToTop() {
  return (
    <div className="fixed bottom-4 right-4 z-50 ">
      <Link
        href="#"
        onClick={(e) => {
          e.preventDefault();
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        className={cn(
          buttonVariants({ variant: "default" }),
          "shadow-lg hover:shadow-xl transition-shadow rounded-full"
        )}
      >
        <ArrowUp className="w-4 h-4" />
      </Link>
    </div>
  );
}
