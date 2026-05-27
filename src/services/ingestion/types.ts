import type { LanguageCode } from "@/domain/languages";

export type SourceRow = Record<string, string>;

export type ParsedContact = {
  provider_name: string;
  phone: string;
  location: string;
  machine_count: number;
  order_id: string;
  language_hint: LanguageCode;
  alternate_phone: string;
  address: string;
  source_row_data: SourceRow;
  source_row_number: number;
};

export type InvalidRow = {
  source_row_number: number;
  source_row_data: SourceRow;
  errors: string[];
};

export type ParseContactFileResult = {
  validRows: ParsedContact[];
  invalidRows: InvalidRow[];
  duplicateRows: InvalidRow[];
  sourceColumns: string[];
};
