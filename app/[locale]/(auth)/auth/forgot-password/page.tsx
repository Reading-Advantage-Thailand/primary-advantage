import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";
import { UserResetPassForm } from "@/components/auth/user-reset-pass-form";
import { buttonVariants } from "@/components/ui/button";

// export const metadata: Metadata = {
//   title: "Authentication",
//   description: "Authentication forms built using the components.",
// };

export default function ForgotPasswordPage() {
  return <UserResetPassForm />;
}
