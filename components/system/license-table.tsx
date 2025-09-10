"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowUpDown,
  ChevronDown,
  MoreHorizontal,
  PencilIcon,
  TrashIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const data: Payment[] = [
  {
    id: "m5gr84i9",
    school_name: "School 1",
    subscription_level: "basic",
    amount: 316,
    status: "active",
    active_users: 100,
    expiry_date: "2025-01-01",
    email: "ken99@example.com",
  },
  {
    id: "3u1reuv4",
    school_name: "School 2",
    subscription_level: "premium",
    amount: 242,
    status: "inactive",
    active_users: 200,
    expiry_date: "2025-01-01",
    email: "Abe45@example.com",
  },
  {
    id: "derv1ws0",
    school_name: "School 3",
    subscription_level: "enterprise",
    amount: 837,
    status: "active",
    active_users: 150,
    expiry_date: "2025-01-01",
    email: "Monserrat44@example.com",
  },
  {
    id: "5kma53ae",
    school_name: "School 4",
    subscription_level: "basic",
    amount: 874,
    status: "inactive",
    active_users: 300,
    expiry_date: "2025-01-01",
    email: "Silas22@example.com",
  },
  {
    id: "bhqecj4p",
    school_name: "School 5",
    subscription_level: "premium",
    amount: 721,
    status: "expired",
    active_users: 550,
    expiry_date: "2025-01-01",
    email: "carmella@example.com",
  },
  {
    id: "m5gr84i9",
    school_name: "School 6",
    subscription_level: "enterprise",
    amount: 316,
    status: "expired",
    active_users: 750,
    expiry_date: "2025-01-01",
    email: "ken99@example.com",
  },
  {
    id: "3u1reuv4",
    school_name: "School 7",
    subscription_level: "basic",
    amount: 242,
    status: "inactive",
    active_users: 700,
    expiry_date: "2025-01-01",
    email: "Abe45@example.com",
  },
  {
    id: "derv1ws0",
    school_name: "School 8",
    subscription_level: "premium",
    amount: 837,
    status: "expired",
    active_users: 600,
    expiry_date: "2025-01-01",
    email: "Monserrat44@example.com",
  },
  {
    id: "5kma53ae",
    school_name: "School 9",
    subscription_level: "enterprise",
    amount: 874,
    status: "active",
    active_users: 300,
    expiry_date: "2025-01-01",
    email: "Silas22@example.com",
  },
  {
    id: "bhqecj4p",
    school_name: "School 10",
    subscription_level: "basic",
    amount: 721,
    status: "active",
    active_users: 200,
    expiry_date: "2025-01-01",
    email: "carmella@example.com",
  },
  {
    id: "m5gr84i9",
    school_name: "School 11",
    subscription_level: "premium",
    amount: 316,
    status: "inactive",
    active_users: 250,
    expiry_date: "2025-01-01",
    email: "ken99@example.com",
  },
  {
    id: "3u1reuv4",
    school_name: "School 12",
    subscription_level: "enterprise",
    amount: 242,
    status: "expired",
    active_users: 150,
    expiry_date: "2025-01-01",
    email: "Abe45@example.com",
  },
  {
    id: "derv1ws0",
    school_name: "School 13",
    subscription_level: "basic",
    amount: 837,
    status: "expired",
    active_users: 120,
    expiry_date: "2025-01-01",
    email: "Monserrat44@example.com",
  },
  {
    id: "5kma53ae",
    school_name: "School 14",
    subscription_level: "premium",
    amount: 874,
    status: "active",
    active_users: 130,
    expiry_date: "2025-01-01",
    email: "Silas22@example.com",
  },
  {
    id: "bhqecj4p",
    school_name: "School 15",
    subscription_level: "enterprise",
    amount: 721,
    status: "inactive",
    active_users: 140,
    expiry_date: "2025-01-01",
    email: "carmella@example.com",
  },
];

export type Payment = {
  id: string;
  school_name: string;
  subscription_level: "basic" | "premium" | "enterprise";
  amount: number;
  status: "active" | "inactive" | "expired";
  active_users: number;
  expiry_date: string;
  email: string;
};

const columns: ColumnDef<Payment>[] = [
  //   {
  //     id: "select",
  //     header: ({ table }) => (
  //       <Checkbox
  //         checked={
  //           table.getIsAllPageRowsSelected() ||
  //           (table.getIsSomePageRowsSelected() && "indeterminate")
  //         }
  //         onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
  //         aria-label="Select all"
  //       />
  //     ),
  //     cell: ({ row }) => (
  //       <Checkbox
  //         checked={row.getIsSelected()}
  //         onCheckedChange={(value) => row.toggleSelected(!!value)}
  //         aria-label="Select row"
  //       />
  //     ),
  //     enableSorting: false,
  //     enableHiding: false,
  //   },

  {
    accessorKey: "school_name",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          School Name
          <ArrowUpDown />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="lowercase">{row.getValue("school_name")}</div>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => <div className="lowercase">{row.getValue("email")}</div>,
  },

  //   {
  //     accessorKey: "amount",
  //     header: () => <div className="text-right">Amount</div>,
  //     cell: ({ row }) => {
  //       const amount = parseFloat(row.getValue("amount"));

  //       const formatted = new Intl.NumberFormat("en-US", {
  //         style: "currency",
  //         currency: "USD",
  //       }).format(amount);

  //       return <div className="text-right font-medium">{formatted}</div>;
  //     },
  //   },
  {
    accessorKey: "active_users",
    header: () => <div className="text-center">Active Users</div>,
    cell: ({ row }) => {
      const activeUsers = parseFloat(row.getValue("active_users"));

      return <div className="text-center font-medium">{activeUsers}</div>;
    },
  },
  {
    accessorKey: "subscription_level",
    header: () => <div className="">Subscription Level</div>,
    cell: ({ row }) => {
      const subscriptionLevel = row.getValue("subscription_level") as string;
      return (
        <div className="capitalize">
          <Badge
            variant={subscriptionLevel as "basic" | "premium" | "enterprise"}
          >
            {subscriptionLevel}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: () => <div className="">Status</div>,
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return (
        <div className="capitalize">
          <Badge variant={status as "active" | "inactive" | "expired"}>
            {status}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "expiry_date",
    header: () => <div className="text-center">Expiry Date </div>,
    cell: ({ row }) => {
      const expiryDate = row.getValue("expiry_date") as string;
      return <div className="text-center capitalize">{expiryDate}</div>;
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const payment = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem>
              <PencilIcon />
              Edit License
            </DropdownMenuItem>
            <DropdownMenuItem>
              <TrashIcon />
              Delete License
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function LicenseTable() {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    [],
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const table = useReactTable({
    data,
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
    <div className="w-full">
      <div className="flex items-center justify-between py-4">
        <Input
          placeholder="Filter school names..."
          value={
            (table.getColumn("school_name")?.getFilterValue() as string) ?? ""
          }
          onChange={(event) =>
            table.getColumn("school_name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <Link href="/system/licenses/create-licenses">
          <Button className="ml-auto">Create License</Button>
        </Link>
      </div>
      <div className="overflow-hidden rounded-md border">
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
  );
}
