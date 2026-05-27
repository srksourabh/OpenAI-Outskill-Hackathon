import { parse } from "csv-parse/sync";
import readXlsxFile from "read-excel-file/node";
import { getEffectiveLanguage } from "@/domain/languages";
import type { InvalidRow, ParseContactFileResult, ParsedContact, SourceRow } from "./types";

const fieldAliases = {
  provider_name: ["provider_name", "provider", "name", "contact_name", "customer_name"],
  phone: ["phone", "mobile", "mobile_number", "phone_number", "contact_number"],
  location: ["location", "city", "site", "branch"],
  machine_count: ["machine_count", "machines", "item_count", "quantity"],
  order_id: ["order_id", "order", "reference_id", "job_id"],
  language_hint: ["language_hint", "language", "lang"],
  alternate_phone: ["alternate_phone", "alternate_mobile", "secondary_phone"],
  address: ["address", "full_address"]
} as const;

type ParseInput = {
  fileName: string;
  content: Buffer;
  defaultLanguage: string;
};

export async function parseContactFile(input: ParseInput): Promise<ParseContactFileResult> {
  const rows = await parseRows(input.fileName, input.content);
  if (rows.length === 0) {
    throw new Error("No contact rows found. Upload a CSV or Excel file with at least one phone number.");
  }

  const sourceColumns = rows.length > 0 ? Object.keys(rows[0]) : [];
  if (!hasRecognizedPhoneColumn(sourceColumns)) {
    throw new Error("Could not find a phone column. Use one of: phone, mobile, mobile_number, phone_number, contact_number.");
  }

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

  const phone = getFieldValue(row, "phone");
  if (!phone) {
    errors.push("phone is required");
  } else if (!isValidPhone(normalizePhone(phone))) {
    errors.push("phone must be a valid mobile number");
  }

  const machineCountValue = getFieldValue(row, "machine_count");
  const machineCount = Number(machineCountValue || "1");
  if (!Number.isInteger(machineCount) || machineCount <= 0) {
    errors.push("machine_count must be a positive integer");
  }

  return errors;
}

function toParsedContact(row: SourceRow, sourceRowNumber: number, defaultLanguage: string): ParsedContact {
  const normalizedPhone = normalizePhone(getFieldValue(row, "phone"));
  const generatedOrderId = `UPLOAD-${String(sourceRowNumber).padStart(3, "0")}`;

  return {
    provider_name: getFieldValue(row, "provider_name") || `Contact ${sourceRowNumber - 1}`,
    phone: normalizedPhone,
    location: getFieldValue(row, "location") || "Unknown",
    machine_count: Number(getFieldValue(row, "machine_count") || "1"),
    order_id: getFieldValue(row, "order_id") || generatedOrderId,
    language_hint: getEffectiveLanguage(getFieldValue(row, "language_hint"), defaultLanguage),
    alternate_phone: normalizeOptionalPhone(getFieldValue(row, "alternate_phone")),
    address: getFieldValue(row, "address") || "",
    source_row_data: { ...row },
    source_row_number: sourceRowNumber
  };
}

function normalizePhone(phone: string) {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (trimmed.startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length >= 11 && digits.length <= 15) return `+${digits}`;
  return trimmed.replace(/[\s()-]/g, "");
}

function normalizeOptionalPhone(phone: string) {
  if (!phone.trim()) return "";
  const normalized = normalizePhone(phone);
  return isValidPhone(normalized) ? normalized : phone.trim();
}

function isValidPhone(phone: string) {
  return /^\+[1-9]\d{9,14}$/.test(phone);
}

function hasRecognizedPhoneColumn(columns: string[]) {
  return columns.some((column) => getCanonicalField(column) === "phone");
}

function getFieldValue(row: SourceRow, field: keyof typeof fieldAliases) {
  const entry = Object.entries(row).find(([column]) => getCanonicalField(column) === field);
  return String(entry?.[1] ?? "").trim();
}

function getCanonicalField(column: string) {
  const normalized = column.trim().toLowerCase();
  const aliasEntries = Object.entries(fieldAliases) as Array<[keyof typeof fieldAliases, readonly string[]]>;
  return aliasEntries.find(([, aliases]) => aliases.includes(normalized))?.[0] ?? null;
}
