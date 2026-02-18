import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function UnauthorizedPage() {
  const t = await getTranslations("UnauthorizedPage");

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <ShieldAlert className="text-destructive h-16 w-16" />
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground max-w-md">{t("description")}</p>
      <Button asChild>
        <Link href="/">{t("backHome")}</Link>
      </Button>
    </div>
  );
}
