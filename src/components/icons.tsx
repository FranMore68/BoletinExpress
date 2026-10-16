import type { CSSProperties } from "react";
export function Icon({
  name,
  size = 22,
  style,
}: {
  name:
    | "arrow"
    | "document"
    | "check"
    | "audio"
    | "photo"
    | "text"
    | "plus"
    | "close"
    | "download"
    | "eye"
    | "wallet"
    | "grid";
  size?: number;
  style?: CSSProperties;
}) {
  const paths = {
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    document: (
      <>
        <path d="M14 3H6v18h13V8zM14 3v6h5M9 13h7m-7 4h5" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    audio: (
      <>
        <rect x="9" y="3" width="6" height="12" rx="3" />
        <path d="M5 11a7 7 0 0 0 14 0m-7 7v3m-4 0h8" />
      </>
    ),
    photo: (
      <>
        <rect x="3" y="6" width="18" height="15" rx="2" />
        <path d="m7 6 2-3h6l2 3" />
        <circle cx="12" cy="13" r="4" />
      </>
    ),
    text: (
      <>
        <path d="M4 5h16M4 10h16M4 15h10M4 20h13" />
      </>
    ),
    plus: <path d="M12 4v16M4 12h16" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    download: (
      <>
        <path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    wallet: (
      <>
        <path d="M4 6h15v14H4zM4 6V3h13v3M15 10h6v6h-6z" />
      </>
    ),
    grid: (
      <>
        <path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={style}
    >
      {paths[name]}
    </svg>
  );
}
