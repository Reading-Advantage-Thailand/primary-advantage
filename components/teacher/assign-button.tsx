"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import AssignForm from "./assign-form";
import { toast } from "sonner";
import { ClipboardCheckIcon, Loader2 } from "lucide-react";
import { DialogFooter } from "@/components/ui/dialog";

interface article {
  title: string;
  summary: string;
  id: string;
}

export default function AssignButton({ article }: { article: article }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const formId = "assign-form";

  const onClose = () => {
    if (!isLoading) {
      setIsOpen(false);
    }
  };

  const onSave = () => {
    setIsOpen(false);
    toast.success("Assignment saved successfully!", {
      richColors: true,
    });
  };

  const handleLoadingChange = (loading: boolean) => {
    setIsLoading(loading);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <ClipboardCheckIcon />
          Assign
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[80vh] overflow-y-auto"
        closeButtonShow={false}
      >
        <DialogHeader>
          <DialogTitle>Create Assignment</DialogTitle>
          <DialogDescription>
            Create an assignment for your students
          </DialogDescription>
        </DialogHeader>
        <div>
          <h3 className="text-lg font-semibold">{article.title}</h3>
          <p className="text-muted-foreground text-sm">{article.summary}</p>
        </div>
        <AssignForm
          onSave={onSave}
          articleId={article.id}
          formId={formId}
          onLoadingChange={handleLoadingChange}
        />
        <DialogFooter>
          <Button onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              "Assign"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
