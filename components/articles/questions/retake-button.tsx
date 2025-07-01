"use client";

import { retakeQuiz } from "@/actions/question";
import { Button } from "@/components/ui/button";
import { ActivityType } from "@/types/enum";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RetakeButton({
  articleId,
  type,
}: {
  articleId: string;
  type: ActivityType;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleRetakeQuiz = async () => {
    await retakeQuiz(articleId, type);
    setIsOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size={"sm"} variant={"outline"}>
          Retake
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Retake</DialogTitle>
          <DialogDescription>
            Are you sure you want to retake this quiz? Your previous answers
            will be cleared.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleRetakeQuiz}>Confirm Retake</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
