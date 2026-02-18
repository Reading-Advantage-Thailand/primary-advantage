import React from "react";
import AuthErrorPage from "../../auth/error/page";
import { getCurrentUser } from "@/lib/session";
import Assignments from "@/components/teacher/assignments";

export default async function AssignmentsPage() {
  const user = await getCurrentUser();

  if (!user) {
    return <AuthErrorPage />;
  }

  return <Assignments />;
}
