import type { Metadata, Viewport } from "next";
import "@fontsource/plus-jakarta-sans/600.css";
import "@fontsource/plus-jakarta-sans/700.css";
import "@fontsource/plus-jakarta-sans/800.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "./globals.css";
import BrandHeader from "@/components/BrandHeader";
import BannerSinConexion from "@/components/BannerSinConexion";
import BottomNav from "@/components/BottomNav";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import SincronizadorPendientes from "@/components/SincronizadorPendientes";

export const metadata: Metadata = {
  title: "HistoriaViva — Registro clínico offline-first",
  description:
    "Aplicación para que el personal de salud registre signos vitales y dosis sin depender de la conexión a Internet.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#FFFFFF",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-cloud">
        <BrandHeader />
        <BannerSinConexion />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 pb-24">{children}</main>
        <BottomNav />
        <ServiceWorkerRegister />
        <SincronizadorPendientes />
      </body>
    </html>
  );
}
