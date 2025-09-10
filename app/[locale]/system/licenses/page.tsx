// import { Role } from "@/server/models/enum";
import React from "react";
import { headers } from "next/headers";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BadgeCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
// import { CreateLicenseForm } from "./create-license-form";
import { Header } from "@/components/header";
import { redirect } from "next/navigation";
import LicenseTable from "@/components/system/license-table";

export default async function LicensePage() {
  // const user = await getCurrentUser();
  // const licenses = await getAllLicenses();

  // if (!user) {
  //   return redirect("/auth/signin");
  // }

  // if (user.role !== Role.SYSTEM) {
  //   return <UnauthorizedPage />;
  // }

  return (
    <div>
      <Header heading="Licenses" text="Create a new license for school" />
      <Separator className="my-4" />
      <LicenseTable />
    </div>
  );
}
