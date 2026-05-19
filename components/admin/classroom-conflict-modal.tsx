"use client";

import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ConflictChoice = "existing" | "new";

interface Conflict {
  name: string;
  existingId: string;
  existingMeta?: Record<string, unknown>;
}

interface Summary {
  newClassroomsToCreate: string[];
  parsedRows: number;
}

interface Props {
  open: boolean;
  conflicts: Conflict[];
  summary: Summary;
  onCancel: () => void;
  onConfirm: (choices: Record<string, ConflictChoice>) => void;
}

export function ClassroomConflictModal({
  open,
  conflicts,
  summary,
  onCancel,
  onConfirm,
}: Props) {
  const t = useTranslations("importAdmin");

  const [choices, setChoices] = useState<Record<string, ConflictChoice>>({});

  // Reset choices when the modal opens with a new set of conflicts
  useEffect(() => {
    if (open) {
      setChoices({});
    }
  }, [open, conflicts]);

  const allResolved =
    conflicts.length > 0 && conflicts.every((c) => choices[c.name] != null);

  const applyToAll = (choice: ConflictChoice) => {
    const next: Record<string, ConflictChoice> = {};
    for (const c of conflicts) {
      next[c.name] = choice;
    }
    setChoices(next);
  };

  const setChoice = (name: string, choice: ConflictChoice) => {
    setChoices((prev) => ({ ...prev, [name]: choice }));
  };

  const handleConfirm = () => {
    if (allResolved) {
      onConfirm(choices);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent
        className={cn(
          // Full-screen on mobile, capped on larger screens
          "flex flex-col gap-0 p-0",
          "h-[100dvh] max-h-[100dvh] w-full max-w-full rounded-none",
          "sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-lg",
        )}
      >
        {/* --- Header (sticky) --- */}
        <DialogHeader className="flex-none border-b px-4 py-4 sm:px-6">
          <DialogTitle className="text-base sm:text-lg">
            {t("conflict.title")}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {t("conflict.description", { count: conflicts.length })}
          </DialogDescription>
        </DialogHeader>

        {/* --- Sticky "Apply to all" bar --- */}
        <div className="flex-none border-b bg-muted/40 px-4 py-3 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <span className="text-muted-foreground shrink-0 text-sm font-medium">
              {t("conflict.applyToAllLabel")}
            </span>
            <div className="flex w-full gap-2 sm:w-auto">
              <Button
                variant="outline"
                className="h-11 flex-1 text-xs sm:h-9 sm:flex-none"
                onClick={() => applyToAll("existing")}
              >
                {t("conflict.applyToAllExisting")}
              </Button>
              <Button
                variant="outline"
                className="h-11 flex-1 text-xs sm:h-9 sm:flex-none"
                onClick={() => applyToAll("new")}
              >
                {t("conflict.applyToAllNew")}
              </Button>
            </div>
          </div>
        </div>

        {/* --- Scrollable conflict list --- */}
        <ScrollArea className="min-h-0 flex-1">
          <ul className="divide-y px-4 sm:px-6">
            {conflicts.map((conflict) => {
              const current = choices[conflict.name];
              return (
                <li key={conflict.name} className="py-4">
                  <p className="mb-3 text-sm font-semibold">{conflict.name}</p>
                  <RadioGroup
                    value={current ?? ""}
                    onValueChange={(val) =>
                      setChoice(conflict.name, val as ConflictChoice)
                    }
                    className="gap-1"
                  >
                    {/* Use existing — tap area is the full row height */}
                    <Label
                      htmlFor={`existing-${conflict.name}`}
                      className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-1 hover:bg-muted/50"
                    >
                      <RadioGroupItem
                        value="existing"
                        id={`existing-${conflict.name}`}
                      />
                      <span className="text-sm font-normal">
                        {t("conflict.useExisting")}
                      </span>
                    </Label>

                    {/* Create new */}
                    <div className="space-y-1">
                      <Label
                        htmlFor={`new-${conflict.name}`}
                        className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-1 hover:bg-muted/50"
                      >
                        <RadioGroupItem
                          value="new"
                          id={`new-${conflict.name}`}
                        />
                        <span className="text-sm font-normal">
                          {t("conflict.createNew")}
                        </span>
                      </Label>
                      {current === "new" && (
                        <p className="text-muted-foreground ml-10 text-xs">
                          {t("conflict.createNewHint", {
                            name: conflict.name,
                          })}
                        </p>
                      )}
                    </div>
                  </RadioGroup>
                </li>
              );
            })}
          </ul>
        </ScrollArea>

        {/* --- Sticky footer --- */}
        <DialogFooter
          className={cn(
            "flex-none border-t px-4 py-4 sm:px-6",
            // Stack on mobile, row on sm+
            "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
          )}
        >
          {!allResolved && conflicts.length > 0 && (
            <p className="flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {t("conflict.allMustChoose")}
            </p>
          )}
          <div
            className={cn(
              "flex w-full gap-2 sm:ml-auto sm:w-auto",
              !allResolved && conflicts.length > 0 ? "" : "sm:ml-auto",
            )}
          >
            <Button
              variant="outline"
              onClick={onCancel}
              className="h-11 flex-1 sm:h-9 sm:flex-none"
            >
              {t("conflict.cancel")}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!allResolved}
              className="h-11 flex-1 sm:h-9 sm:flex-none"
            >
              {t("conflict.confirm")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
