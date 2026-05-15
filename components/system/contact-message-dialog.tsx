"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { CopyIcon, MailIcon, ExternalLinkIcon, Trash2Icon } from "lucide-react";
import {
  ContactMessage,
  ContactMessageStatus,
  ContactMessageInquiry,
} from "./contact-messages-table";

const MANUAL_STATUS_OPTIONS: ContactMessageStatus[] = ["REPLIED", "ARCHIVED"];

function statusBadgeClass(status: ContactMessageStatus) {
  switch (status) {
    case "NEW":
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300";
    case "READ":
      return "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300";
    case "REPLIED":
      return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300";
    case "ARCHIVED":
      return "bg-muted text-muted-foreground border-muted-foreground/20";
  }
}

function inquiryBadgeClass(inquiry: ContactMessageInquiry) {
  switch (inquiry) {
    case "SALES":
      return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300";
    case "SUPPORT":
      return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300";
    case "PARTNERSHIPS":
      return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300";
  }
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  message: ContactMessage;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdate: (id: string, newStatus: ContactMessageStatus) => void;
  onDelete: (id: string) => Promise<void>;
};

export default function ContactMessageDialog({
  message,
  open,
  onOpenChange,
  onStatusUpdate,
  onDelete,
}: Props) {
  const t = useTranslations("System.ContactMessages");
  const [status, setStatus] = React.useState<ContactMessageStatus>(
    message.status,
  );
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Sync local status when message prop changes
  React.useEffect(() => {
    setStatus(message.status);
  }, [message.status, message.id]);

  // Auto-mark NEW → READ silently on dialog open
  React.useEffect(() => {
    if (message.status !== "NEW") return;
    fetch(`/api/system/contact-messages/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "READ" }),
    })
      .then((res) => {
        if (res.ok) {
          setStatus("READ");
          onStatusUpdate(message.id, "READ");
        }
      })
      .catch((err) => {
        console.error("Failed to auto-mark message as READ:", err);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.id]);

  async function handleStatusChange(newStatus: ContactMessageStatus) {
    if (newStatus === status) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/system/contact-messages/${message.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setStatus(newStatus);
        onStatusUpdate(message.id, newStatus);
        toast.success(t("toasts.statusUpdated"));
      } else {
        toast.error(t("toasts.statusUpdateError"));
      }
    } catch {
      toast.error(t("toasts.statusUpdateError"));
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDeleteConfirmed() {
    setIsDeleting(true);
    try {
      await onDelete(message.id);
      onOpenChange(false);
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleCopyEmail() {
    try {
      await navigator.clipboard.writeText(message.email);
      toast.success(t("toasts.emailCopied"));
    } catch {
      toast.error("Failed to copy email");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("dialog.title")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Submitter info */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                {t("columns.name")}
              </p>
              <p className="mt-0.5 font-medium">{message.name}</p>
              {message.institution && (
                <p className="text-muted-foreground text-sm">
                  {message.institution}
                </p>
              )}
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                {t("columns.email")}
              </p>
              <div className="mt-0.5 flex items-center gap-2">
                <p className="text-sm">{message.email}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleCopyEmail}
                  title={t("actions.copyEmail")}
                >
                  <CopyIcon className="h-3.5 w-3.5" />
                </Button>
                <a
                  href={`mailto:${message.email}?subject=Re: Your inquiry`}
                  title={t("actions.sendEmail")}
                >
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MailIcon className="h-3.5 w-3.5" />
                  </Button>
                </a>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                {t("columns.inquiry")}
              </p>
              <div className="mt-1">
                <Badge
                  variant="outline"
                  className={`text-xs ${inquiryBadgeClass(message.inquiry)}`}
                >
                  {t(`inquiryLabels.${message.inquiry}`)}
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                {t("dialog.submittedAt")}
              </p>
              <p className="mt-0.5 text-sm">
                {formatDateTime(message.createdAt)}
              </p>
            </div>
          </div>

          {/* Registered user */}
          {message.user && (
            <div className="bg-muted/50 rounded-md px-3 py-2 text-sm">
              <span className="font-medium">{t("dialog.registeredUser")}: </span>
              <span>
                {message.user.name ?? t("dialog.from")} ({message.user.email})
              </span>
              <a
                href={`/system/users/${message.user.id}`}
                className="text-primary ml-1 inline-flex items-center gap-0.5 hover:underline"
              >
                <ExternalLinkIcon className="h-3 w-3" />
              </a>
            </div>
          )}

          <Separator />

          {/* Message body */}
          <div>
            <p className="text-muted-foreground mb-1.5 text-xs font-medium uppercase tracking-wide">
              {t("dialog.messageLabel")}
            </p>
            <p className="bg-muted/40 whitespace-pre-wrap rounded-md px-3 py-2.5 text-sm leading-relaxed">
              {message.message}
            </p>
          </div>

          <Separator />

          {/* Status changer */}
          <div className="flex items-center gap-3">
            <p className="text-muted-foreground text-sm font-medium">
              {t("dialog.statusLabel")}:
            </p>
            <Badge
              variant="outline"
              className={`text-xs ${statusBadgeClass(status)}`}
            >
              {t(`status.${status}`)}
            </Badge>
            <Select
              value={
                MANUAL_STATUS_OPTIONS.includes(status) ? status : undefined
              }
              onValueChange={(v) =>
                handleStatusChange(v as ContactMessageStatus)
              }
              disabled={isUpdating}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue
                  placeholder={t("dialog.statusChangePlaceholder")}
                />
              </SelectTrigger>
              <SelectContent>
                {MANUAL_STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    <Badge
                      variant="outline"
                      className={`text-xs ${statusBadgeClass(s)}`}
                    >
                      {t(`status.${s}`)}
                    </Badge>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isUpdating && (
              <span className="text-muted-foreground text-xs">Saving...</span>
            )}
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2 sm:justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                disabled={isDeleting}
              >
                <Trash2Icon className="h-4 w-4" />
                {t("actions.delete")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {t("confirmDelete.title")}
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {t("confirmDelete.description", { name: message.name })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  {t("confirmDelete.cancel")}
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleDeleteConfirmed}
                >
                  {t("confirmDelete.confirm")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyEmail}
              className="gap-1.5"
            >
              <CopyIcon className="h-4 w-4" />
              {t("actions.copyEmail")}
            </Button>
            <a href={`mailto:${message.email}?subject=Re: Your inquiry`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <MailIcon className="h-4 w-4" />
                {t("actions.sendEmail")}
              </Button>
            </a>
            <DialogClose asChild>
              <Button variant="outline" size="sm">
                {t("actions.close")}
              </Button>
            </DialogClose>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
