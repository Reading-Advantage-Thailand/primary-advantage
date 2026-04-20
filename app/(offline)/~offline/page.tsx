import { WifiOffIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <Image
        src="/primary-advantage.png"
        alt="Primary Advantage"
        width={80}
        height={80}
        className="opacity-80"
      />
      <div className="flex flex-col items-center gap-2">
        <WifiOffIcon className="h-12 w-12 text-amber-500" />
        <h1 className="text-2xl font-bold">You&apos;re offline</h1>
        <p className="text-muted-foreground max-w-xs text-sm">
          Check your internet connection and try again.
        </p>
      </div>
      <Link
        href="/"
        className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium transition-colors"
      >
        Try again
      </Link>
    </div>
  );
}
