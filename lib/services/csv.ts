import Papa from "papaparse";
import { recruiterSchema } from "@/lib/validators";

export function parseRecruiterCsv(content: string) {
  const parsed = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (value) => value.trim().toLowerCase()
  });

  if (parsed.errors.length > 0) {
    throw new Error(parsed.errors[0]?.message ?? "Unable to parse CSV file");
  }

  return parsed.data.map((row) =>
    recruiterSchema.parse({
      name: row.name?.trim(),
      email: row.email?.trim(),
      company: row.company?.trim()
    })
  );
}

export function exportCsv(rows: Array<Record<string, string | number | null | undefined>>) {
  if (rows.length === 0) {
    return "";
  }

  const headers = Object.keys(rows[0]);
  const escape = (value: string | number | null | undefined) => {
    const normalized = value == null ? "" : String(value);
    return `"${normalized.replace(/"/g, '""')}"`;
  };

  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(","))
  ].join("\n");
}
