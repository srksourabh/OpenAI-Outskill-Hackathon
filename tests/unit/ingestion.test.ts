import { describe, expect, it } from "vitest";
import { parseContactFile } from "@/services/ingestion/parser";

describe("parseContactFile", () => {
  it("parses CSV contacts, preserves extra columns, and defaults language to Hindi", async () => {
    const csv = [
      "provider_name,phone,location,machine_count,order_id,custom_note",
      "Ravi,+919999999991,Mumbai,2,ORD-1,Gate 2"
    ].join("\n");

    const result = await parseContactFile({
      fileName: "contacts.csv",
      content: Buffer.from(csv),
      defaultLanguage: "hi"
    });

    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].language_hint).toBe("hi");
    expect(result.validRows[0].source_row_data.custom_note).toBe("Gate 2");
  });

  it("reports invalid rows without dropping valid rows", async () => {
    const csv = [
      "provider_name,phone,location,machine_count,order_id",
      "Valid,+919999999991,Mumbai,2,ORD-1",
      "Broken,,Delhi,0,ORD-2"
    ].join("\n");

    const result = await parseContactFile({
      fileName: "contacts.csv",
      content: Buffer.from(csv),
      defaultLanguage: "hi"
    });

    expect(result.validRows).toHaveLength(1);
    expect(result.invalidRows).toHaveLength(1);
    expect(result.invalidRows[0].errors).toContain("phone is required");
  });
});
