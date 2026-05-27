import { parse } from "csv-parse/sync";
import readXlsxFile from "read-excel-file/node";
import { getEffectiveLanguage } from "@/domain/languages";
import type { InvalidRow, ParseContactFileResult, ParsedContact, SourceRow } from "./types";

const requiredColumns = ["provider_name", "phone", "location", "machine_count", "order_id"] as const;

type ParseInput = {
  fileName: string;
  content: Buffer;
  defaultLanguage: string;
};

export async function parseContactFile(input: ParseInput): Promise<ParseContactFileResult> {
  const rows = await parseRows(input.fileName, input.content);
  const sourceColumns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const seen = new Set<string>();
  const validRows: ParsedContact[] = [];
  const invalidRows: InvalidRow[] = [];
  const duplicateRows: InvalidRow[] = [];

  rows.forEach((row, index) => {
    const sourceRowNumber = index + 2;
    const errors = validateRow(row);
    if (errors.length > 0) {
      invalidRows.push({ source_row_number: sourceRowNumber, source_row_data: row, errors });
      return;
    }

    const parsed = toParsedContact(row, sourceRowNumber, input.defaultLanguage);
    const duplicateKey = `${parsed.phone}|${parsed.order_id}`;
    if (seen.has(duplicateKey)) {
      duplicateRows.push({
        source_row_number: sourceRowNumber,
        source_row_data: row,
        errors: ["duplicate phone and order_id"]
      });
      return;
    }

    seen.add(duplicateKey);
    validRows.push(parsed);
  });

  return { validRows, invalidRows, duplicateRows, sourceColumns };
}

async function parseRowsFromWorkbook(content: Buffer): Promise<SourceRow[]> {
  const table = await readXlsxFile(content);
  const [headerRow, ...dataRows] = table;
  const headers = (headerRow ?? []).map((value) => String(value ?? "").trim()).filter(Boolean);
  return dataRows
    .map((row) => {
      const sourceRow: SourceRow = {};
      headers.forEach((header, index) => {
        sourceRow[header] = String(row[index] ?? "").trim();
      });
      return sourceRow;
    })
    .filter((row) => Object.values(row).some(Boolean));
}

function parseRows(fileName: string, content: Buffer): SourceRow[] | Promise<SourceRow[]> {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".csv")) {
    return parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as SourceRow[];
  }

  if (lowerName.endsWith(".xlsx")) {
    return parseRowsFromWorkbook(content);
  }

  throw new Error("Unsupported file type. Upload .xlsx or .csv.");
}

function validateRow(row: SourceRow) {
  const errors: string[] = [];
  for (const column of requiredColumns) {
    if (!String(row[column] ?? "").trim()) {
      errors.push(`${column} is required`);
    }
  }

  const machineCount = Number(row.machine_count);
  if (!Number.isInteger(machineCount) || machineCount <= 0) {
    errors.push("machine_count must be a positive integer");
  }

  return errors;
}

function toParsedContact(row: SourceRow, sourceRowNumber: number, defaultLanguage: string): ParsedContact {
  return {
    provider_name: String(row.provider_name).trim(),
    phone: normalizePhone(String(row.phone).trim()),
    location: String(row.location).trim(),
    machine_count: Number(row.machine_count),
    order_id: String(row.order_id).trim(),
    language_hint: getEffectiveLanguage(row.language_hint, defaultLanguage),
    alternate_phone: String(row.alternate_phone ?? "").trim(),
    address: String(row.address ?? "").trim(),
    source_row_data: { ...row },
    source_row_number: sourceRowNumber
  };
}

function normalizePhone(phone: string) {
  const compact = phone.replace(/[\s()-]/g, "");
  if (compact.startsWith("+")) return compact;
  if (compact.length === 10) return `+91${compact}`;
  return compact;
}
