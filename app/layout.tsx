import type { Metadata } from "next";
import "@/app/globals.css";
import { Providers } from "@/components/providers";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "RecruitIQ | AI Job Search OS",
  description:
    "AI-powered job search operating system with ATS analysis, recruiter email generation, reply scoring, A/B testing, portfolio copy, and strategy intelligence."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
