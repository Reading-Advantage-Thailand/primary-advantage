import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function Home() {
  const t = useTranslations("HomePage");
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1>{t("title")}</h1>
      <Link href="/about">{t("about")}</Link>
      <Link href="/auth">Log in</Link>
    </div>
  );
}
