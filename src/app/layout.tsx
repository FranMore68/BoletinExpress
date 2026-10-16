import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "BoletinExpress",
  description: "Preparación asistida de BRIE y CIE ELEC-1.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
