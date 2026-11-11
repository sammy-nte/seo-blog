import Papa from "papaparse";

export type CsvRow = Record<string, string>;

export interface ParsedCsv {
  fileName: string;
  headers: string[];
  rows: CsvRow[];
  preview: CsvRow[];
  rowCount: number;
}

const max_bytes = 10 * 1024 * 1024;

export function parseCsvFile(file: File): Promise<ParsedCsv> {
  if (!file.name.toLowerCase().endsWith(".csv")) {
    return Promise.reject(new Error("Please choose a .csv file."));
  }
  if (file.size === 0) {
    return Promise.reject(new Error("This CSV file is empty."));
  }
  if (file.size > max_bytes) {
    return Promise.reject(new Error("Please choose a CSV smaller than 10 MB."));
  }

  return new Promise((resolve, reject) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: "greedy",
      dynamicTyping: false,
      transformHeader: (header) => header.trim().replace(/^\uFEFF/, ""),
      complete: (result) => {
        const headers = result.meta.fields ?? [];

        if (!headers.length || headers.some((header) => !header)) {
          reject(new Error("The first row needs a name for every column."));
          return;
        }
        if (Object.keys(result.meta.renamedHeaders ?? {}).length) {
          reject(
            new Error(
              "Column names must be unique. Please rename repeated headers and try again.",
            ),
          );
          return;
        }
        if (result.errors.length) {
          const first = result.errors[0]!;
          const row = first.row === undefined ? "" : ` at row ${first.row + 2}`;
          reject(new Error(`CSV parsing stopped${row}: ${first.message}`));
          return;
        }
        if (!result.data.length) {
          reject(new Error("The CSV has headers but no data rows."));
          return;
        }

        const rows = result.data.map((row) =>
          Object.fromEntries(
            headers.map((header) => [header, String(row[header] ?? "").trim()]),
          ),
        );

        resolve({
          fileName: file.name,
          headers,
          rows,
          preview: rows.slice(0, 5),
          rowCount: rows.length,
        });
      },
      error: () =>
        reject(
          new Error("The file could not be read. Please try another CSV."),
        ),
    });
  });
}
