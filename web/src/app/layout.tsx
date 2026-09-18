import type { Metadata, Viewport } from "next";
import { Mulish } from "next/font/google";
import "./globals.css";
import NavBar from "@/components/NavBar";

const mulish = Mulish({
  variable: "--font-mulish",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "HistoriaViva — Registro clínico offline-first",
  description:
    "Aplicación para que el personal de salud registre signos vitales y dosis sin depender de la conexión a Internet.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#402F6C",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${mulish.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-neutral-1">
        <NavBar />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">{children}</main>
        <footer className="pb-8 text-center text-xs text-black-4">
          <p>Instalable como aplicación · Registro offline-first para personal de salud</p>
        </footer>
      </body>
    </html>
  );
}
