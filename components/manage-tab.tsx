"use client";

import React, { startTransition } from "react";
import { Header } from "./header";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
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
import { Button } from "./ui/button";
import { ArrowUpDown, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { deleteFlashcardByIdAction } from "@/server/controllers/articleController";

type Sentence = {
  id: string;
  articleId: string | null;
  createdAt: Date;
  sentence: string | null;
  due: Date;
  //   sn: number;
  //   timepoint: number;
  //   translation: { th: string; cn: string; tw: string; vi: string };
  //   userId: string;
  //   due: Date; // Date when the card is next due for review
  //   stability: number; // A measure of how well the information is retained
  //   difficulty: number; // Reflects the inherent difficulty of the card content
  //   elapsed_days: number; // Days since the card was last reviewed
  //   scheduled_days: number; // The interval at which the card is next scheduled
  //   reps: number; // Total number of times the card has been reviewed
  //   lapses: number; // Times the card was forgotten or remembered incorrectly
  //   state: State; // The current state of the card (New, Learning, Review, Relearning)
  //   last_review?: Date; // The most recent review date, if applicable
};

interface ManageTabProps {
  data: Sentence[];
}

function getSimpleDueText(dueDate: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(
    dueDate.getFullYear(),
    dueDate.getMonth(),
    dueDate.getDate(),
  );

  const diffDays = Math.ceil(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) {
    const daysLate = Math.abs(diffDays);
    return daysLate === 1 ? "1 day late" : `${daysLate} days late`;
  } else if (diffDays === 0) {
    return "Due today";
  } else if (diffDays === 1) {
    return "Due tomorrow";
  } else if (diffDays <= 7) {
    return `Due in ${diffDays} days`;
  } else {
    return `Due in ${Math.ceil(diffDays / 7)} weeks`;
  }
}

function getDueColor(dueDate: Date): "destructive" | "secondary" | "default" {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const due = new Date(
    dueDate.getFullYear(),
    dueDate.getMonth(),
    dueDate.getDate(),
  );

  const diffDays = Math.ceil(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) return "destructive"; // Overdue - red
  if (diffDays === 0) return "secondary"; // Due today - orange/yellow
  return "default"; // Future - blue/gray
}

// Add this helper function to your component:
function getCreatedAtText(createdAt: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - createdAt.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;

  // For old items, show the actual date
  return createdAt.toLocaleDateString();
}

export default function ManageTab({ data }: ManageTabProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "due", desc: false },
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [sentences, setSentences] = React.useState<Sentence[]>(data);

  const columns: ColumnDef<Sentence>[] = [
    {
      accessorKey: "sentence",
      header: "Sentence",
      cell: ({ row }) => {
        const sentence = row.getValue("sentence") as string;
        return <div className="whitespace-pre-wrap">{sentence}</div>;
      },
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Created At
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const createdAt = row.getValue("createdAt") as Date;
        return (
          <div
            className="text-muted-foreground text-center text-sm"
            title={`Created: ${createdAt.toLocaleString()}`}
          >
            {getCreatedAtText(createdAt)}
          </div>
        );
      },
    },
    {
      accessorKey: "due",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Due
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const due = row.getValue("due") as Date;
        return (
          <div className="gap- flex items-center">
            <Badge
              variant={getDueColor(due)}
              className="flex items-center gap-1"
            >
              {getSimpleDueText(due)}
            </Badge>
          </div>
        );
      },
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => {
        const id = row.original.id;
        const sentence = row.original.sentence;
        return (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Flashcard</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this flashcard?
                </AlertDialogDescription>
                <div className="bg-muted mt-2 rounded p-2 font-mono text-sm">
                  "{sentence?.substring(0, 50)}..."
                </div>
                <div className="text-muted-foreground text-sm">
                  This action cannot be undone.
                </div>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        );
      },
    },
  ];

  const table = useReactTable({
    data: sentences,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  });

  const handleDelete = async (id: string) => {
    startTransition(async () => {
      const result = await deleteFlashcardByIdAction(id);
      if (result.success) {
        toast.success(result.message);
        setSentences(sentences.filter((sentence) => sentence.id !== id));
      } else {
        toast.error(result.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      <Header
        heading="Manage"
        text="Manage your flashcard articles and sentences"
      />
      <div className="flex flex-col gap-4">
        <div className="flex items-center py-4">
          <Input
            placeholder={"Search..."}
            value={
              (table.getColumn("sentence")?.getFilterValue() as string) ?? ""
            }
            onChange={(event) =>
              table.getColumn("sentence")?.setFilterValue(event.target.value)
            }
            className="max-w-sm"
          />
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                  >
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
                    className="h-24 text-center"
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
