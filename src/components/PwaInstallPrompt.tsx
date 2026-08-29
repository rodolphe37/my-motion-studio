import { useEffect } from "react";
import { usePwaInstall } from "../hooks/usePwaInstall";

/**
 * Bandeau d'installation PWA (bas de page).
 * - Chromium (Android / desktop) : bouton « Installer » natif.
 * - iOS Safari : instructions « Partager → Sur l'écran d'accueil ».
 * Composant autonome : aucune dépendance externe, styles injectés, dark mode
 * via `prefers-color-scheme`. Se masque seul une fois l'app installée ou le
 * bandeau fermé (mémorisé en localStorage).
 */

const STYLE_ID = "pwa-install-prompt-style";

const CSS = `
.pwaip { position: fixed; z-index: 2147483000; font-family: inherit;
  left: max(16px, env(safe-area-inset-left, 0px));
  right: max(16px, env(safe-area-inset-right, 0px));
  bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  margin-inline: auto; max-width: 420px;
  animation: pwaip-in .32s cubic-bezier(.22,1,.36,1); }
@keyframes pwaip-in { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .pwaip { animation: none; } }

.pwaip__card { box-sizing: border-box; display: flex; align-items: center; gap: 12px;
  padding: 12px; border-radius: 16px;
  background: #ffffff; color: #111827; border: 1px solid #e5e7eb;
  box-shadow: 0 12px 32px rgba(15,23,42,.18); }
.pwaip__row { display: flex; align-items: center; gap: 12px; flex: 1; min-width: 0; }
.pwaip__grow { min-width: 0; flex: 1; }
.pwaip__icon { width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0; object-fit: cover;
  display: flex; align-items: center; justify-content: center;
  background: #eff6ff; color: #2563eb; }
.pwaip__title { margin: 0; font-size: 14px; font-weight: 600; }
.pwaip__text { margin: 2px 0 0; font-size: 12px; line-height: 1.5; color: #6b7280; }
.pwaip__glyph { display: inline-block; vertical-align: -3px; margin: 0 2px; color: #2563eb; }
.pwaip__nowrap { white-space: nowrap; }
.pwaip__cta { flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;
  gap: 6px; border: 0; cursor: pointer; border-radius: 999px; padding: 8px 14px;
  font: inherit; font-size: 13px; font-weight: 600; color: #ffffff; background: #2563eb; }
.pwaip__cta:hover { background: #1d4ed8; }
.pwaip__close { flex-shrink: 0; align-self: flex-start; display: inline-flex; border: 0;
  cursor: pointer; border-radius: 999px; padding: 6px; background: transparent; color: #9ca3af; }
.pwaip__close:hover { color: #4b5563; background: rgba(0,0,0,.05); }
.pwaip__close--in { display: none; }

@media (max-width: 639px) {
  .pwaip__card--cta { flex-direction: column; align-items: stretch; gap: 10px; }
  .pwaip__card--cta .pwaip__cta { width: 100%; padding: 10px 14px; }
  .pwaip__card--cta .pwaip__close--in { display: inline-flex; }
  .pwaip__card--cta .pwaip__close--out { display: none; }
}

@media (prefers-color-scheme: dark) {
  .pwaip__card { background: #1e293b; color: #f1f5f9; border-color: #334155;
    box-shadow: 0 12px 32px rgba(0,0,0,.5); }
  .pwaip__text { color: #94a3b8; }
  .pwaip__icon { background: #1e3a5f; color: #93c5fd; }
  .pwaip__glyph { color: #93c5fd; }
  .pwaip__close { color: #64748b; }
  .pwaip__close:hover { color: #cbd5e1; background: rgba(255,255,255,.08); }
}
`;

function useInjectedStyle() {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = STYLE_ID;
    el.textContent = CSS;
    document.head.appendChild(el);
  }, []);
}

/* ─── Glyphes (SVG inline, pas de dépendance) ─────────────────────────────── */

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

const DownloadIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const PhoneIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" {...stroke} aria-hidden="true">
    <rect x="5" y="2" width="14" height="20" rx="2" />
    <line x1="12" y1="18" x2="12" y2="18" />
  </svg>
);

const ShareIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    {...stroke}
    className="pwaip__glyph"
    role="img"
    aria-label="Partager"
  >
    <path d="M12 15V3" />
    <path d="m7 8 5-5 5 5" />
    <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7" />
  </svg>
);

/* ─── Composant ──────────────────────────────────────────────────────────── */

export default function PwaInstallPrompt({
  icon,
  bottomOffset = 16,
}: {
  /** URL de l'icône de l'app (192px de préférence). Sinon, glyphe générique. */
  icon?: string;
  /** Décalage en bas, en px, pour laisser la place à une barre de navigation. */
  bottomOffset?: number;
}) {
  const { canInstall, showIosHint, promptInstall, dismiss } = usePwaInstall();
  useInjectedStyle();

  if (!canInstall && !showIosHint) return null;

  const rootStyle = {
    bottom: `calc(${bottomOffset}px + env(safe-area-inset-bottom, 0px))`,
  };

  const appIcon = icon ? (
    <img className="pwaip__icon" src={icon} alt="" width={44} height={44} />
  ) : (
    <span className="pwaip__icon">
      <PhoneIcon />
    </span>
  );

  if (showIosHint) {
    return (
      <div className="pwaip" style={rootStyle} role="region" aria-label="Installer l'application">
        <div className="pwaip__card">
          <div className="pwaip__row">
            {appIcon}
            <div className="pwaip__grow">
              <p className="pwaip__title">Installer l'application</p>
              <p className="pwaip__text">
                Appuyez sur <ShareIcon /> puis{" "}
                <span className="pwaip__nowrap">«&nbsp;Sur l'écran d'accueil&nbsp;»</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            className="pwaip__close pwaip__close--out"
            onClick={dismiss}
            aria-label="Fermer"
          >
            <CloseIcon />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pwaip" style={rootStyle} role="region" aria-label="Installer l'application">
      <div className="pwaip__card pwaip__card--cta">
        <div className="pwaip__row">
          {appIcon}
          <div className="pwaip__grow">
            <p className="pwaip__title">Installer l'application</p>
            <p className="pwaip__text">Accès rapide depuis votre écran d'accueil</p>
          </div>
          <button
            type="button"
            className="pwaip__close pwaip__close--in"
            onClick={dismiss}
            aria-label="Fermer"
          >
            <CloseIcon />
          </button>
        </div>
        <button type="button" className="pwaip__cta" onClick={promptInstall}>
          <DownloadIcon />
          Installer
        </button>
        <button
          type="button"
          className="pwaip__close pwaip__close--out"
          onClick={dismiss}
          aria-label="Fermer"
        >
          <CloseIcon />
        </button>
      </div>
    </div>
  );
}
