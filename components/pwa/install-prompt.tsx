"use client";

import { useEffect, useState } from "react";
import { DownloadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/use-pwa-install";

const DISMISSED_KEY = "pwa-install-dismissed";

export function InstallPrompt() {
  const { isInstallable, promptInstall } = usePwaInstall();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === "1");
  }, []);

  if (!isInstallable || dismissed) return null;

  const handleInstall = async () => {
    await promptInstall();
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={handleInstall}
      >
        <DownloadIcon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Install App</span>
      </Button>
      <button
        onClick={handleDismiss}
        className="text-muted-foreground hover:text-foreground text-xs"
        aria-label="Dismiss install prompt"
      >
        ✕
      </button>
    </div>
  );
}
