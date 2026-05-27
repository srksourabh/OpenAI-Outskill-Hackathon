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

  it("accepts phone-only uploads with common mobile headers and fills sensible defaults", async () => {
    const csv = [
      "mobile_number,language",
      "9876543210,en"
    ].join("\n");

    const result = await parseContactFile({
      fileName: "contacts.csv",
      content: Buffer.from(csv),
      defaultLanguage: "hi"
    });

    expect(result.validRows).toHaveLength(1);
    expect(result.validRows[0].phone).toBe("+919876543210");
    expect(result.validRows[0].provider_name).toBe("Contact 1");
    expect(result.validRows[0].location).toBe("Unknown");
    expect(result.validRows[0].machine_count).toBe(1);
    expect(result.validRows[0].language_hint).toBe("en");
  });

  it("flags malformed phone numbers clearly", async () => {
    const csv = [
      "phone,order_id",
      "1234,ORD-1"
    ].join("\n");

    const result = await parseContactFile({
      fileName: "contacts.csv",
      content: Buffer.from(csv),
      defaultLanguage: "hi"
    });

    expect(result.validRows).toHaveLength(0);
    expect(result.invalidRows).toHaveLength(1);
    expect(result.invalidRows[0].errors).toContain("phone must be a valid mobile number");
  });
});
