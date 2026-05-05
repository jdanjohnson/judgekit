/**
 * Minimal RFC 4180-ish CSV parser.
 * Handles quoted fields with embedded commas, newlines, and "" escapes.
 * Returns headers + rows as string[][].
 */
export function parseCSV(input: string): { headers: string[]; rows: string[][] } {
  const records: string[][] = [];
  let field = "";
  let record: string[] = [];
  let inQuotes = false;
  let i = 0;

  // Strip UTF-8 BOM if present.
  if (input.charCodeAt(0) === 0xfeff) {
    input = input.slice(1);
  }

  while (i < input.length) {
    const ch = input[i];

    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }

    if (ch === ",") {
      record.push(field);
      field = "";
      i++;
      continue;
    }

    if (ch === "\r") {
      // normalize CRLF -> LF
      i++;
      continue;
    }

    if (ch === "\n") {
      record.push(field);
      records.push(record);
      field = "";
      record = [];
      i++;
      continue;
    }

    field += ch;
    i++;
  }

  // Flush the last field/record if the file doesn't end in a newline.
  if (field.length > 0 || record.length > 0) {
    record.push(field);
    records.push(record);
  }

  // Drop trailing empty records (e.g. file ending with \n).
  while (
    records.length > 0 &&
    records[records.length - 1].length === 1 &&
    records[records.length - 1][0] === ""
  ) {
    records.pop();
  }

  if (records.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = records[0].map((h) => h.trim());
  const rows = records.slice(1);
  return { headers, rows };
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
