import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Industrias CIN | Plataforma Empresarial",
  description: "Sistema Integral de Gestión y Optimización Operativa - Bebidas No Carbonatadas (Hervidos y Jugos)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen font-sans antialiased text-slate-800 bg-slate-50">
        {children}
      </body>
    </html>
  );
}
