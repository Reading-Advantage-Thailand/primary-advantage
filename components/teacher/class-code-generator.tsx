"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { QrCode, Copy, RefreshCw, Calendar, Users } from "lucide-react";
import { format } from "date-fns";

interface ClassCodeGeneratorProps {
  classroomId: string;
  classroomName: string;
  currentClassCode?: string | null;
  codeExpiresAt?: string | null;
  onCodeGenerated?: () => void;
  buttonSize?: "sm" | "default" | "lg";
  buttonVariant?: "default" | "outline" | "ghost" | "secondary";
}

export default function ClassCodeGenerator({
  classroomId,
  classroomName,
  currentClassCode,
  codeExpiresAt,
  onCodeGenerated,
  buttonSize = "default",
  buttonVariant = "default",
}: ClassCodeGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [classCode, setClassCode] = useState(currentClassCode || "");
  const [expiresAt, setExpiresAt] = useState(codeExpiresAt || "");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateCode = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(
        `/api/classroom/${classroomId}/generate-code`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to generate class code");
      }

      const data = await response.json();
      setClassCode(data.classCode);
      setExpiresAt(data.expiresAt);
      toast.success("Class code generated successfully!");
      onCodeGenerated?.();
    } catch (error) {
      console.error("Error generating class code:", error);
      toast.error("Failed to generate class code");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = async () => {
    if (!classCode) return;

    try {
      await navigator.clipboard.writeText(classCode);
      toast.success("Class code copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy class code:", error);
      toast.error("Failed to copy class code");
    }
  };

  const handleCopyInstructions = async () => {
    if (!classCode) return;

    const instructions = `🎓 Join ${classroomName}

Use this password to join: ${classCode}

Instructions:
1. Go to the student login page
2. Enter the password: ${classCode}
3. Select your name from the list
4. Start learning!

⏰ This code expires: ${expiresAt ? format(new Date(expiresAt), "PPP 'at' p") : "Never"}`;

    try {
      await navigator.clipboard.writeText(instructions);
      toast.success("Instructions copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy instructions:", error);
      toast.error("Failed to copy instructions");
    }
  };

  const isCodeExpired = () => {
    if (!expiresAt) return false;
    return new Date() > new Date(expiresAt);
  };

  const getExpirationStatus = () => {
    if (!expiresAt) return null;

    const now = new Date();
    const expiry = new Date(expiresAt);
    const isExpired = now > expiry;

    if (isExpired) {
      return { text: "Expired", variant: "destructive" as const };
    }

    const hoursLeft = Math.ceil(
      (expiry.getTime() - now.getTime()) / (1000 * 60 * 60),
    );

    if (hoursLeft <= 24) {
      return { text: `${hoursLeft}h left`, variant: "secondary" as const };
    }

    const daysLeft = Math.ceil(hoursLeft / 24);
    return { text: `${daysLeft}d left`, variant: "outline" as const };
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      // Refresh data when opening
      setClassCode(currentClassCode || "");
      setExpiresAt(codeExpiresAt || "");
    }
  };

  const expirationStatus = getExpirationStatus();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size={buttonSize} variant={buttonVariant}>
          <QrCode className="mr-1 h-4 w-4" />
          Generate Password
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Password for {classroomName}
          </DialogTitle>
          <DialogDescription>
            Generate a code that students can use to join this classroom.
            Students will use this code to login and access class materials.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {classCode && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="classCode">Password</Label>
                <div className="relative">
                  <Input
                    id="classCode"
                    type="text"
                    value={classCode}
                    readOnly
                    className="pr-20 text-center font-mono text-2xl tracking-wider"
                  />
                  <div className="absolute top-1/2 right-2 flex -translate-y-1/2 gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={handleCopyCode}
                      title="Copy code"
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>

              {expiresAt && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="h-4 w-4" />
                    Expires: {format(new Date(expiresAt), "PPP 'at' p")}
                  </div>
                  {expirationStatus && (
                    <Badge variant={expirationStatus.variant}>
                      {expirationStatus.text}
                    </Badge>
                  )}
                </div>
              )}

              <div className="rounded-lg bg-blue-50 p-4">
                <h4 className="mb-2 font-medium text-blue-900">
                  Instructions for Students:
                </h4>
                <ol className="space-y-1 text-sm text-blue-800">
                  <li>1. Go to the student login page</li>
                  <li>
                    2. Enter the password:{" "}
                    <span className="font-mono font-bold">{classCode}</span>
                  </li>
                  <li>3. Select their name from the student list</li>
                  <li>4. Start learning!</li>
                </ol>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={handleCopyInstructions}
                >
                  <Copy className="mr-1 h-3 w-3" />
                  Copy Instructions
                </Button>
              </div>
            </div>
          )}

          <Button
            onClick={handleGenerateCode}
            disabled={isGenerating}
            className="w-full"
            variant={classCode ? "outline" : "default"}
          >
            {isGenerating ? (
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            {isGenerating
              ? "Generating..."
              : classCode
                ? "Generate New Code"
                : "Generate Password"}
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
