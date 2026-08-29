import { useCallback, useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa-install-dismissed";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * iOS Safari ne déclenche jamais `beforeinstallprompt` : l'installation se
 * fait manuellement via « Partager → Sur l'écran d'accueil ». On détecte ce
 * cas pour afficher des instructions à la place du bouton.
 */
function isIosSafari() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  const isIos =
    /iphone|ipad|ipod/i.test(ua) ||
    // iPadOS 13+ se fait passer pour un Mac
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  // Exclut Chrome/Firefox/Edge iOS : leur menu de partage diffère
  const isSafari = /safari/i.test(ua) && !/crios|fxios|edgios|opios/i.test(ua);
  return isIos && isSafari;
}

/**
 * Gère l'installation PWA sur toutes les plateformes :
 * - Chromium (Android / desktop) : bouton natif via `beforeinstallprompt`
 * - iOS Safari : instructions manuelles
 * Masqué si l'app est déjà installée ou si l'utilisateur a fermé le bandeau.
 */
export function usePwaInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandalone());
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }, [deferred]);

  const dismiss = useCallback(() => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const iosSafari = isIosSafari();

  return {
    /** Android / desktop Chromium : bouton d'installation natif disponible. */
    canInstall: Boolean(deferred) && !installed && !dismissed,
    /** iOS Safari : afficher les instructions « Partager → Sur l'écran d'accueil ». */
    showIosHint: iosSafari && !installed && !dismissed,
    promptInstall,
    dismiss,
  };
}
