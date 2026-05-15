"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, EyeIcon, InboxIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
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
import ContactMessageDialog from "./contact-message-dialog";

export type ContactMessageStatus = "NEW" | "READ" | "REPLIED" | "ARCHIVED";
export type ContactMessageInquiry = "SALES" | "SUPPORT" | "PARTNERSHIPS";

export type ContactMessage = {
  id: string;
  name: string;
  institution: string | null;
  email: string;
  inquiry: ContactMessageInquiry;
  message: string;
  userId: string | null;
  user: { id: string; name: string | null; email: string } | null;
  status: ContactMessageStatus;
  createdAt: string;
  updatedAt: string;
};

type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type CountsMeta = {
  all: number;
  new: number;
  read: number;
  replied: number;
  archived: number;
};

type ApiResponse = {
  data: ContactMessage[];
  pagination: PaginationMeta;
  counts: CountsMeta;
};

const STATUS_TABS = ["ALL", "NEW", "READ", "REPLIED", "ARCHIVED"] as const;
type StatusTab = (typeof STATUS_TABS)[number];

const INQUIRY_OPTIONS = ["ALL", "SALES", "SUPPORT", "PARTNERSHIPS"] as const;
type InquiryOption = (typeof INQUIRY_OPTIONS)[number];

function statusBadgeVariant(status: ContactMessageStatus) {
  switch (status) {
    case "NEW":
      return "default"; // blue/primary
    case "READ":
      return "secondary"; // gray
    case "REPLIED":
      return "outline"; // will be styled green
    case "ARCHIVED":
      return "secondary";
  }
}

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

function formatDate(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ContactMessagesTable() {
  const t = useTranslations("System.ContactMessages");

  const [data, setData] = React.useState<ContactMessage[]>([]);
  const [pagination, setPagination] = React.useState<PaginationMeta>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [counts, setCounts] = React.useState<CountsMeta>({
    all: 0,
    new: 0,
    read: 0,
    replied: 0,
    archived: 0,
  });
  const [loading, setLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState<StatusTab>("ALL");
  const [inquiry, setInquiry] = React.useState<InquiryOption>("ALL");
  const [search, setSearch] = React.useState("");
  const [debouncedSearch, setDebouncedSearch] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [selectedMessage, setSelectedMessage] =
    React.useState<ContactMessage | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page on filter change
  React.useEffect(() => {
    setPage(1);
  }, [activeTab, inquiry]);

  const fetchMessages = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
        status: activeTab,
        inquiry: inquiry,
      });
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`/api/system/contact-messages?${params}`);
      if (res.ok) {
        const json: ApiResponse = await res.json();
        setData(json.data);
        setPagination(json.pagination);
        setCounts(json.counts);
      }
    } catch (err) {
      console.error("Failed to fetch contact messages:", err);
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, inquiry, debouncedSearch]);

  React.useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleStatusUpdate = React.useCallback(
    (id: string, newStatus: ContactMessageStatus) => {
      setData((prev) =>
        prev.map((msg) =>
          msg.id === id ? { ...msg, status: newStatus } : msg,
        ),
      );
      // Refetch to get accurate counts
      fetchMessages();
    },
    [fetchMessages],
  );

  const handleDelete = React.useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/system/contact-messages/${id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          toast.success(t("toasts.deleted"));
          setData((prev) => prev.filter((msg) => msg.id !== id));
          fetchMessages();
        } else if (res.status === 404) {
          toast.info(t("toasts.alreadyDeleted"));
          setData((prev) => prev.filter((msg) => msg.id !== id));
          fetchMessages();
        } else {
          toast.error(t("toasts.deleteError"));
          console.error("Delete failed:", res.status, await res.text());
        }
      } catch (err) {
        toast.error(t("toasts.deleteError"));
        console.error("Delete error:", err);
      }
    },
    [fetchMessages, t],
  );

  const columns: ColumnDef<ContactMessage>[] = [
    {
      accessorKey: "createdAt",
      header: t("columns.createdAt"),
      cell: ({ row }) => (
        <div className="text-muted-foreground text-sm whitespace-nowrap">
          {formatDate(row.getValue("createdAt"))}
        </div>
      ),
    },
    {
      accessorKey: "name",
      header: t("columns.name"),
      cell: ({ row }) => {
        const msg = row.original;
        return (
          <div>
            <div className="font-medium">{msg.name}</div>
            {msg.institution && (
              <div className="text-muted-foreground text-xs">
                {msg.institution}
              </div>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: t("columns.email"),
      cell: ({ row }) => <div className="text-sm">{row.getValue("email")}</div>,
    },
    {
      accessorKey: "inquiry",
      header: t("columns.inquiry"),
      cell: ({ row }) => {
        const inq = row.getValue("inquiry") as ContactMessageInquiry;
        return (
          <Badge
            variant="outline"
            className={`text-xs ${inquiryBadgeClass(inq)}`}
          >
            {t(`inquiryLabels.${inq}`)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "status",
      header: t("columns.status"),
      cell: ({ row }) => {
        const status = row.getValue("status") as ContactMessageStatus;
        return (
          <Badge
            variant={statusBadgeVariant(status)}
            className={`text-xs ${statusBadgeClass(status)}`}
          >
            {t(`status.${status}`)}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: t("columns.actions"),
      cell: ({ row }) => {
        const msg = row.original;
        return (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedMessage(msg);
                setDialogOpen(true);
              }}
            >
              <EyeIcon className="mr-1 h-3.5 w-3.5" />
              {t("actions.view")}
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                >
                  <Trash2Icon className="h-3.5 w-3.5" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t("confirmDelete.title")}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("confirmDelete.description", { name: msg.name })}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>
                    {t("confirmDelete.cancel")}
                  </AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={() => handleDelete(msg.id)}
                  >
                    {t("confirmDelete.confirm")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: data ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: pagination.totalPages,
  });

  const tabCountKey: Record<StatusTab, keyof CountsMeta> = {
    ALL: "all",
    NEW: "new",
    READ: "read",
    REPLIED: "replied",
    ARCHIVED: "archived",
  };

  const hasFilters =
    activeTab !== "ALL" || inquiry !== "ALL" || debouncedSearch !== "";

  return (
    <>
      {/* Status Tabs */}
      <div className="mb-4 flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => (
          <Button
            key={tab}
            variant={activeTab === tab ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab(tab)}
            className="gap-1.5"
          >
            {t(`tabs.${tab.toLowerCase() as Lowercase<StatusTab>}`)}
            <span
              className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${
                activeTab === tab
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {counts[tabCountKey[tab]]}
            </span>
          </Button>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <Input
          placeholder={t("filters.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select
          value={inquiry}
          onValueChange={(v) => setInquiry(v as InquiryOption)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder={t("filters.inquiryPlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            {INQUIRY_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={opt}>
                {t(
                  `filters.inquiryOptions.${opt.toLowerCase() as "all" | "sales" | "support" | "partnerships"}`,
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-md border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {columns.map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-36 text-center"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <InboxIcon className="text-muted-foreground h-8 w-8" />
                      <p className="font-medium">{t("empty.title")}</p>
                      <p className="text-muted-foreground text-sm">
                        {hasFilters
                          ? t("empty.filteredDescription")
                          : t("empty.description")}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between py-4">
        <p className="text-muted-foreground text-sm">
          {pagination.total > 0
            ? `${(page - 1) * pagination.limit + 1}–${Math.min(page * pagination.limit, pagination.total)} of ${pagination.total}`
            : ""}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setPage((p) => Math.min(pagination.totalPages, p + 1))
            }
            disabled={page >= pagination.totalPages || loading}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Detail Dialog */}
      {selectedMessage && (
        <ContactMessageDialog
          message={selectedMessage}
          open={dialogOpen}
          onOpenChange={(open: boolean) => {
            setDialogOpen(open);
            if (!open) setSelectedMessage(null);
          }}
          onStatusUpdate={handleStatusUpdate}
          onDelete={handleDelete}
        />
      )}
    </>
  );
}
