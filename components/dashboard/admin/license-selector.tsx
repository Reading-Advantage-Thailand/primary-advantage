"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { fetchLicensesApi, fetchSchoolsListApi } from "@/utils/api-request";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList, // อย่าลืม import ตัวนี้
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronsUpDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface License {
  id: string;
  name: string;
  maxUsers: number;
  expiresAt: Date;
  _count?: {
    users: number;
  };
}

interface LicenseSelectorProps {
  onLicenseChange: (licenseId: string) => void;
}

export default function LicenseSelector({
  onLicenseChange,
}: LicenseSelectorProps) {
  const t = useTranslations("Admin.Dashboard.licenseSelector");
  const [selectedLicenseId, setSelectedLicenseId] = useState<string>("");
  const [open, setOpen] = useState<boolean>(false);

  const handleLicenseChange = (licenseId: string) => {
    setSelectedLicenseId(licenseId);
    onLicenseChange(licenseId);
    setOpen(false);
  };

  const { data, isPending, error, isError } = useQuery({
    queryKey: ["system-school-list"],
    queryFn: () => fetchSchoolsListApi(),
    enabled: true,
    staleTime: 60 * 60 * 1000, // Cache 1 ชั่วโมง
  });

  const schools: License[] = Array.isArray(data) ? data : [];
  const selectedLicense = schools.find((l) => l.id === selectedLicenseId);

  if (isPending) {
    return <div>Loading...</div>;
  }

  if (isError) {
    return <div>Error: {error?.message}</div>;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between" // ปรับความกว้างตามต้องการ
              disabled={isPending} // ปิดปุ่มถ้ายังโหลดข้อมูลไม่เสร็จ
            >
              {isPending
                ? t("loading")
                : selectedLicenseId
                  ? selectedLicense?.name
                  : t("placeholder")}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="p-0"
            align="start"
            style={{ width: "var(--radix-popover-trigger-width)" }}
          >
            <Command>
              {/* ส่วนช่องค้นหา: shadcn จะ filter ข้อมูลใน list ให้เองอัตโนมัติ */}
              <CommandInput placeholder={t("placeholder")} />

              <CommandList>
                {/* <CommandEmpty>{t("noResults")}</CommandEmpty> */}

                <CommandGroup>
                  {schools.map((school, index) => (
                    <CommandItem
                      key={index}
                      value={school.name} // **สำคัญ** ใส่ name เพื่อให้ shadcn ใช้ search
                      onSelect={() => handleLicenseChange(school.id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedLicenseId === school.id
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      <div className="flex flex-col">
                        <span className="font-medium">{school.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {t("users", {
                            used: school?._count?.users || 0,
                            max: school.maxUsers,
                          })}
                        </span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </CardContent>
    </Card>
  );
}
