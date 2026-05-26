import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";

export const metadata: Metadata = {
  title: "TKA Admin",
  description: "Panel admin internal untuk upload dan kelola materi TKA.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
