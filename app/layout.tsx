import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Acharya — AI Tutor",
  description:
    "Vernacular AI tutor for Indian school children, with Brooks–Iyengar fault-tolerant consensus across three independent LLMs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-neutral-100 text-whatsapp-textPrimary">
        {children}
      </body>
    </html>
  );
}
