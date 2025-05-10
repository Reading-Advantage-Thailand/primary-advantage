import { Header } from "@/components/header";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChangeUsernameForm } from "@/components/change-username-form";
import { UpdateUserLicenseForm } from "@/components/update-user-license";
import { BadgeCheck } from "lucide-react";
import { Icons } from "@/components/icons";
import { redirect } from "next/navigation";
import Link from "next/link";
import ChangeRole from "@/components/shared/change-role";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { Role } from "@/types/enum";

export default async function UserProfileSettingsPage() {
  const session = await auth();

  // check if user is not logged in and redirect to signin page
  if (!session) {
    return redirect("/auth/signin");
  }

  return (
    <div>
      <Header
        heading="Personal information"
        text="Information about your personal profile"
      />
      <Link
        href="/student/read"
        className="inline-block mb-4 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
      >
        &larr; Back to Reading Page
      </Link>
      <Separator className="my-4" />
      <div className="mx-2 flex gap-4 flex-col md:flex-row">
        <div className="w-full">
          <ChangeUsernameForm
            username={session.user.name as string}
            userId={session.user.id as string}
          />
          <DisplaySettingInfo
            title="Email"
            data={session.user.email as string}
            // verified={session.user.email_verified}
            resetPassword
            showVerified
          />
          {/* <DisplaySettingInfo title="Google Classroom Link" /> */}
          {/* <GoogleClassroomButtonLink status={Boolean(googleActive)} /> */}
          <DisplaySettingInfo
            title="Primary advantage level"
            data={session.user.cefrLevel || "unknown"}
          />
          <DisplaySettingInfo
            title="Primary advantage XP"
            desc="The XP is used to level up."
            data={session.user.xp?.toString() || "0"}
          />
          {/* <ResetDialog users={user.id} /> */}
          <UpdateUserLicenseForm
            username={session.user.name as string}
            userId={session.user.id as string}
            // expired={user.expired_date}
          />
        </div>
        {process.env.NODE_ENV === "development" && (
          <ChangeRole
            className="md:w-[38rem]"
            userId={session.user.id as string}
            userRole={session.user.role as Role}
          />
        )}
      </div>
    </div>
  );
}

interface DisplaySettingInfoProps {
  title: string;
  desc?: string;
  data?: string;
  badge?: string;
  verified?: boolean;
  showVerified?: boolean;
  resetPassword?: boolean;
}

// const handleSendEmailVerification = async () => {
//   const user = getAuth(firebaseApp).currentUser;

//   if (!user) return;
//   if (user.emailVerified) {
//     await fetch(`/api/users/${user.uid}`, {
//       method: "PUT",
//       body: JSON.stringify({
//         emailVerified: true,
//       }),
//     })
//       .catch((err) => {
//         toast({
//           title: "Error",
//           description: "Something went wrong",
//           variant: "destructive",
//         });
//       })
//       .finally(() => {
//         toast({
//           title: "Email verified",
//           description: "Your email has been verified already",
//           variant: "destructive",
//         });
//       });
//   }
//   if (user.emailVerified) {
//     // refresh page

//     return;
//   }
//   sendEmailVerification(user!, {
//     url: `${process.env.NEXT_PUBLIC_BASE_URL}/settings/user-profile`,
//     handleCodeInApp: true,
//   })
//     .then((user) => {
//       toast({
//         title: "Email verification sent",
//         description: "Please check your email to verify your account",
//       });
//     })
//     .catch((err) => {
//       console.log(err);
//       switch (err.code) {
//         case "auth/too-many-requests":
//           toast({
//             title: "Too many requests",
//             description: "Please try again later",
//             variant: "destructive",
//           });
//           break;
//         default:
//           toast({
//             title: "Error",
//             description: "Something went wrong",
//             variant: "destructive",
//           });
//           break;
//       }
//     });
// };

// const handleSendResetPassword = (email: string) => {
//   sendPasswordResetEmail(firebaseAuth, email)
//     .then(() => {
//       toast({
//         title: "Password reset email sent",
//         description: "Please check your email to reset your password",
//       });
//     })
//     .catch((err) => {
//       console.log(err);
//       toast({
//         title: "Error",
//         description: "Something went wrong",
//         variant: "destructive",
//       });
//     });
// };

const DisplaySettingInfo: React.FC<DisplaySettingInfoProps> = ({
  title,
  desc,
  data,
  badge,
  verified,
  resetPassword,
  showVerified = false,
}) => (
  <>
    <div className="text-sm font-medium mt-3">
      {title}
      {badge && (
        <Badge className="ml-2" variant="secondary">
          {badge}
        </Badge>
      )}
    </div>
    {desc && <p className="text-[0.8rem] text-muted-foreground mt-2">{desc}</p>}
    {data && (
      <div className="flex justify-between items-center text-[0.8rem] text-muted-foreground rounded-lg border bg-card shadow px-3 py-2 my-2">
        <p>{data}</p>
        {showVerified && (
          <div className="flex items-center gap-1">
            {verified ? (
              <span className="text-green-800 dark:text-green-300 flex items-center gap-1">
                <BadgeCheck size={16} />
                Verified
              </span>
            ) : (
              <span className="text-red-800 dark:text-red-300 flex items-center gap-1">
                {/* <Icons.unVerified size={16} /> */}
                Not verified
              </span>
            )}
          </div>
        )}
      </div>
    )}

    <div className="flex gap-2">
      {/* {resetPassword && (
        <Button
          variant="secondary"
          size="sm"
        >
          Reset Password
        </Button>
      )} */}
      {/* {showVerified && !verified && (
        <Button
          //onClick={() => handleSendEmailVerification()}
          variant="secondary"
          size="sm"
        >
          Resend verification email
        </Button>
      )} */}
    </div>
  </>
);
