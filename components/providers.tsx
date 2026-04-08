"use client";

import { Toaster } from "sonner";
import { JobOsCommandPalette } from "@/components/layout/job-os-command-palette";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <JobOsCommandPalette />
      <Toaster richColors position="top-right" theme="dark" />
    </>
  );
}
