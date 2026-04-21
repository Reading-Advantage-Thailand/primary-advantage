"use client";

import { useEffect, useState } from "react";
import { DownloadIcon, Share2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePwaInstall } from "@/hooks/use-pwa-install";

const DISMISSED_KEY = "pwa-install-dismissed";

export function InstallPrompt() {
  const { isInstallable, promptInstall, isIOS, isStandalone } = usePwaInstall();
  const [dismissed, setDismissed] = useState(true);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === "1");
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
    setShowIOSGuide(false);
  };

  if (isStandalone || dismissed) return null;

  // iOS: show a button that opens manual instructions
  if (isIOS) {
    return (
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => setShowIOSGuide((v) => !v)}
        >
          <Share2Icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Install App</span>
        </Button>
        {showIOSGuide && (
          <div className="bg-popover text-popover-foreground border-border absolute right-4 top-16 z-50 w-64 rounded-lg border p-3 text-xs shadow-lg">
            <p className="font-medium">Add to Home Screen</p>
            <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-muted-foreground">
              <li>Tap the <strong>Share</strong> button in Safari</li>
              <li>Scroll down and tap <strong>Add to Home Screen</strong></li>
              <li>Tap <strong>Add</strong> to confirm</li>
            </ol>
          </div>
        )}
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

  // Android / Chrome: use native beforeinstallprompt
  if (!isInstallable) return null;

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={promptInstall}
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
