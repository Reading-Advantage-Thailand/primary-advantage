import { Metadata } from "next";
import { UserSignInForm } from "@/components/auth/user-signin-form";

export const metadata: Metadata = {
  title: "Authentication",
  description: "Authentication forms built using the components.",
};

export default function SignInPage() {
  return <UserSignInForm />;
}
