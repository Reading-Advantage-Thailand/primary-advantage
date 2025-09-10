"use client";
import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  TableHead,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  ChevronsUpDownIcon,
  ChevronDownIcon,
  MoreHorizontalIcon,
  TrendingUp,
  RotateCcw,
} from "lucide-react";
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Header } from "../header";
import { useRouter } from "next/navigation";
import { useCurrentRole } from "@/hooks/use-current-role";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import StudentCefrLevelSetter from "./student-cefr-level-setter";

type Student = {
  id: string;
  email: string;
  display_name: string;
  xp?: number;
  level?: number;
  cefrLevel?: string;
  classrooms?: Array<{
    id: string;
    name: string;
    teacher?: {
      id: string;
      name: string;
      email: string;
    };
  }>;
};

type MyStudentProps = {
  matchedStudents: Student[];
};

export default function MyStudents() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  // const t = useScopedI18n("components.articleRecordsTable");
  // const ts = useScopedI18n("components.myStudent");
  const router = useRouter();
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const userRole = useCurrentRole();

  const fetchStudents = async () => {
    try {
      const response = await fetch("/api/classroom/students", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch students: ${response.status}`);
      }

      const data = await response.json();
      setStudents(data.students || []);
    } catch (error) {
      console.error("Error fetching students:", error);
      setStudents([]);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleResetProgress = async (selectedStudentId: string) => {
    try {
      const response = await fetch(`/api/users/${selectedStudentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          xp: 0,
          level: 1,
          cefrLevel: "A1-",
        }),
      });

      if (response.status === 400) {
        toast("XP reset failed.");
        return;
      }

      if (response.status === 200) {
        toast("XP reset successfully.");
        // Refresh the students list
        const updatedResponse = await fetch("/api/classroom/students");
        if (updatedResponse.ok) {
          const data = await updatedResponse.json();
          setStudents(data.students || []);
        }
      }
    } catch (error) {
      console.error("Error resetting progress:", error);
      toast("XP reset failed.");
    } finally {
      setIsResetModalOpen(false);
    }
  };

  const columns: ColumnDef<Student>[] = [
    {
      accessorKey: "display_name",
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Name
            <ChevronsUpDownIcon className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => {
        const studentName: string = row.getValue("display_name");
        return (
          <div className="captoliza ml-4">
            {studentName ? studentName : "Anonymous"}
          </div>
        );
      },
    },
    {
      accessorKey: "email",
      header: () => {
        return <div>Email</div>;
      },
      cell: ({ row }) => {
        const studentEmail: string = row.getValue("email");
        return (
          <div className="captoliza">
            {studentEmail ? studentEmail : "Unknown"}
          </div>
        );
      },
    },
    // Conditionally add classrooms column for SYSTEM users
    ...(userRole === "SYSTEM"
      ? [
          {
            accessorKey: "classrooms",
            header: () => {
              return <div className="text-center">Classrooms</div>;
            },
            cell: ({ row }: any) => {
              const classrooms: Array<{
                id: string;
                name: string;
                teacher?: { name: string };
              }> = row.getValue("classrooms") || [];
              return (
                <div className="text-center">
                  {classrooms.length > 0 ? (
                    <div className="flex justify-center gap-1">
                      {classrooms.slice(0, 2).map((classroom, index) => (
                        <span
                          key={index}
                          className="items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-700/10"
                        >
                          {classroom.name}
                          {classroom.teacher && (
                            <span className="ml-1 text-gray-500">
                              ({classroom.teacher.name})
                            </span>
                          )}
                        </span>
                      ))}
                      {classrooms.length > 2 && (
                        <span className="text-xs text-gray-500">
                          +{classrooms.length - 2} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400">No classes</span>
                  )}
                </div>
              );
            },
          },
        ]
      : []),
    {
      accessorKey: "action",
      header: () => {
        return <div className="text-center">Actions</div>;
      },
      cell: ({ row }) => {
        const payment = row.original;
        return (
          <div className="text-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Actions</span>
                  <MoreHorizontalIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onClick={() =>
                    router.push(`/teacher/student-progress/${payment.id}`)
                  }
                >
                  <TrendingUp className="mr-1 size-4" />
                  Progress
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div>
                  <StudentCefrLevelSetter
                    studentId={payment.id}
                    studentName={payment.display_name || "Student"}
                    currentCefrLevel={payment.cefrLevel || "A1-"}
                    onUpdate={fetchStudents}
                  />
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setIsResetModalOpen(true);
                    setSelectedStudentId(payment.id);
                  }}
                  className="text-red-600"
                >
                  <RotateCcw className="mr-1 size-4" />
                  Reset Progress
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: students,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <>
      <div className="flex flex-col gap-4">
        <Input
          placeholder="Search Name"
          value={
            (table.getColumn("display_name")?.getFilterValue() as string) ?? ""
          }
          onChange={(event) =>
            table.getColumn("display_name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <div className="rounded-md border">
          <Table style={{ tableLayout: "fixed", width: "100%" }}>
            <TableHeader className="font-bold">
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
                    Empty
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2">
          <div className="space-x-2">
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
      <Dialog
        open={isResetModalOpen}
        onOpenChange={() => setIsResetModalOpen(!isResetModalOpen)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Progress</DialogTitle>
            <DialogDescription>
              Are you sure you want to reset the progress of this student?
            </DialogDescription>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsResetModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => handleResetProgress(selectedStudentId)}
              >
                Reset
              </Button>
            </DialogFooter>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}
