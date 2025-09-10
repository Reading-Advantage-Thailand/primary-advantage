"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Plus } from "lucide-react";

interface CreateSchoolCardProps {
  onCreate: () => void;
}

export function CreateSchoolCard({ onCreate }: CreateSchoolCardProps) {
  return (
    <Card className="border-muted-foreground/25 border-2 border-dashed">
      <CardHeader className="text-center">
        <div className="bg-muted mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          <Building2 className="text-muted-foreground h-8 w-8" />
        </div>
        <CardTitle>No School Associated</CardTitle>
        <CardDescription>
          You don't have a school associated with your account yet. Create one
          to get started and gain Admin access to manage school features.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button onClick={onCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create School
        </Button>
      </CardContent>
    </Card>
  );
}
