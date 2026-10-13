import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wish BI",
  description: "Painel operacional de vendas da Wish Fine Jewelry",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
