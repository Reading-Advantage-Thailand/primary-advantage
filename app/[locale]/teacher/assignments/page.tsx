import React from "react";
import AuthErrorPage from "../../auth/error/page";
import { currentUser } from "@/lib/session";
import Assignments from "@/components/teacher/assignments";

/**
 * Renders the assignments page for authenticated teachers.
 * Returns an auth error page if the user is not logged in.
 */
export default async function AssignmentsPage() {
  const user = await currentUser();

  if (!user) {
    return <AuthErrorPage />;
  }

  return <Assignments />;
}
