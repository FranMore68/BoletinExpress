import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const inter = localFont({
  src: "../../public/fonts/inter.ttf",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
});
const jakarta = localFont({
  src: "../../public/fonts/jakarta.ttf",
  variable: "--font-jakarta",
  display: "swap",
  weight: "200 800",
});
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
      <body className={`${inter.variable} ${jakarta.variable}`}>
        {children}
      </body>
    </html>
  );
}
