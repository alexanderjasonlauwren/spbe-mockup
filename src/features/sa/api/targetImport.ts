/**
 * The Base SA parser and diff, in the browser.
 *
 * # Why this exists twice
 *
 * The service has the same parser in Go, and that one is the authority: in API
 * mode the file is uploaded and the server answers with the diff. This copy is
 * what makes the demo build a demo — a mock that could not read a file would
 * leave the import screen with nothing to show, and an import screen nobody can
 * try is a screen nobody reviews.
 *
 * Two implementations of one rule set is a real cost, and it is paid on purpose
 * rather than by accident. The rules below are transcribed from
 * `internal/usecase/saimport/parse.go` and `diff.go`, and where the wording of a
 * message differs the reason is stated at the point it differs.
 *
 * # What it reads
 *
 * A two-column sheet of date and quantity, exported to CSV:
 *
 *     tanggal,target
 *     2026-09-01,350
 *     2026-09-07,0
 *
 * That is a DECLARED format, not the client's actual workbook. We have not seen
 * their Base SA file, and guessing at its sheet layout would be inventing the
 * shape of someone else's document. When the real file arrives, this file and
 * its Go counterpart change; nothing downstream of `ParsedRow` does.
 *
 * # Why a planned zero is not a skipped row
 *
 * Sundays and public holidays are zeros, and they are why a target of zero is
 * allowed at all. A parser that skipped empty cells would erase the distinction
 * the record exists to keep: "nothing was due" and "nobody entered it" are the
 * same silence and very different facts when a penalty is being argued. So a
 * zero is a row, and a BLANK is an issue rather than a zero — we do not know
 * which the author meant.
 */
import type {
  SAImportChange,
  SAImportDiff,
  SAImportIssue,
} from "../types";

/** One date's obligation as the file states it. */
export interface ParsedTargetRow {
  /** ISO date. */
  tanggal: string;
  target: number;
  /** 1-based line in the source, so an issue can point at it. */
  baris: number;
}

export interface ParsedTargets {
  rows: ParsedTargetRow[];
  issues: SAImportIssue[];
}

/** A file that parsed cleanly and contained nothing. */
export const PESAN_TANPA_BARIS =
  "Berkas ini tidak memuat satu pun tanggal dengan jumlah.";

/**
 * The shapes a date may arrive in.
 *
 * ISO first because it is unambiguous. The two Indonesian forms are here
 * because a spreadsheet exported on an id-ID machine writes them, and refusing
 * those would mean reformatting a file that looks correct to its author.
 *
 * Deliberately NO month-first format. 03/09/2026 is 3 September in every locale
 * this system serves, and accepting the American reading would silently move a
 * third of the month's obligations to the wrong date.
 */
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const DMY = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/;

/**
 * Splits CSV text into records, honouring quoted fields.
 *
 * Hand-rolled rather than a dependency, and quote-aware rather than a `split`
 * on commas: an outlet note containing a comma is ordinary in an export, and a
 * naive split turns one such line into a parse error the author cannot see the
 * cause of.
 */
export function splitCsv(text: string): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let quoted = false;

  // A byte-order mark survives Excel's "CSV UTF-8" export and would otherwise
  // make the first date unparseable — as a header, silently dropping day one.
  const src = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < src.length; i += 1) {
    const ch = src[i];

    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      record.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      // \r\n is one break, not two empty records.
      if (ch === "\r" && src[i + 1] === "\n") i += 1;
      record.push(field);
      records.push(record);
      record = [];
      field = "";
    } else {
      field += ch;
    }
  }

  record.push(field);
  records.push(record);
  // A trailing newline leaves one empty record, which is punctuation, not data.
  if (records.length > 0 && records[records.length - 1].every((f) => f === "")) {
    records.pop();
  }
  return records;
}

/**
 * Reads a Base SA export.
 *
 * The header row is detected rather than assumed: exports vary in whether they
 * carry one, and consuming a data row as a header would silently drop the first
 * of the month.
 */
export function parseTargetCsv(text: string): ParsedTargets {
  const result: ParsedTargets = { rows: [], issues: [] };
  const seen = new Map<string, number>();

  splitCsv(text).forEach((record, index) => {
    const baris = index + 1;

    if (record.length < 2) {
      if (record.every((f) => f.trim() === "")) return;
      result.issues.push({
        baris,
        nilai: record.join(","),
        alasan: "baris ini tidak memuat tanggal dan jumlah",
      });
      return;
    }

    const rawDate = record[0].trim();
    const rawQty = record[1].trim();

    const tanggal = parseDate(rawDate);
    if (!tanggal) {
      // The header is the one unparseable first row we expect, so it is skipped
      // silently rather than reported as a problem.
      if (baris === 1) return;
      result.issues.push({
        baris,
        nilai: rawDate,
        alasan: "bukan tanggal yang dikenali",
      });
      return;
    }

    if (rawQty === "") {
      // Blank is not zero. A zero is a decision the supplier made; a blank is a
      // cell nobody filled in, and treating one as the other invents an
      // obligation of nothing.
      result.issues.push({
        baris,
        nilai: rawDate,
        alasan: "jumlahnya kosong; tulis 0 untuk hari yang memang nol",
      });
      return;
    }

    const target = parseQty(rawQty);
    if (typeof target === "string") {
      result.issues.push({ baris, nilai: rawQty, alasan: target });
      return;
    }

    const duplicate = seen.get(tanggal);
    if (duplicate !== undefined) {
      result.issues.push({
        baris,
        nilai: rawDate,
        alasan: `tanggal ini muncul lebih dari sekali (sudah ${duplicate}); satu tanggal satu angka`,
      });
      return;
    }
    seen.set(tanggal, target);
    result.rows.push({ tanggal, target, baris });
  });

  // Ordered by date whatever the file's order, so a diff reads as a calendar
  // and two imports of the same sheet produce the same output.
  result.rows.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  return result;
}

/**
 * Reads a date in any accepted shape, as a plain calendar date.
 *
 * Returned as an ISO string rather than a Date: a target belongs to a date, not
 * a moment, and a Date parsed in the browser's zone becomes the previous day
 * the moment the machine sits east of UTC.
 */
function parseDate(raw: string): string | null {
  const iso = ISO.exec(raw);
  if (iso) return valid(+iso[1], +iso[2], +iso[3]);

  const dmy = DMY.exec(raw);
  if (dmy) return valid(+dmy[3], +dmy[2], +dmy[1]);

  return null;
}

/** Rejects 31 April rather than rolling it into 1 May, as `new Date` would. */
function valid(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1) return null;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > lastDay) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${year}-${pad(month)}-${pad(day)}`;
}

/**
 * Reads a quantity, tolerating the thousands separators a spreadsheet writes
 * and refusing anything that is not a whole, non-negative number.
 *
 * Returns the reason as a string on failure, so the caller reports the cell
 * rather than a generic "invalid row".
 */
function parseQty(raw: string): number | string {
  const cleaned = raw.replace(/[.,\s\u00A0]/g, "");
  if (!/^-?\d+$/.test(cleaned)) return `"${raw}" bukan bilangan bulat`;
  const qty = Number(cleaned);
  if (qty < 0) {
    // A negative obligation is not something a supplier can state, and the
    // database would refuse it anyway — caught here so the message names the
    // cell instead of a constraint.
    return `"${raw}" bernilai negatif; target tidak bisa kurang dari nol`;
  }
  return qty;
}

/**
 * Compares parsed rows against what the agreement already holds.
 *
 * Dates already on record but ABSENT from the file are deliberately not
 * reported as deletions, and applying never removes them. A Base SA covering
 * half a month is a partial statement, not an instruction to erase the rest;
 * treating an absent date as a deletion would let an incomplete export wipe
 * obligations the supplier never withdrew.
 */
export function buildTargetDiff(
  parsed: ParsedTargets,
  existing: Map<string, number>,
): SAImportDiff {
  const diff: SAImportDiff = {
    perubahan: [],
    masalah: parsed.issues,
    baru: 0,
    berubah: 0,
    tetap: 0,
    dilewati: parsed.issues.length,
  };

  for (const row of parsed.rows) {
    const current = existing.get(row.tanggal);
    const change: SAImportChange = {
      tanggal: row.tanggal,
      jenis: "baru",
      menjadi: row.target,
    };

    if (current === undefined) {
      diff.baru += 1;
    } else if (current === row.target) {
      change.jenis = "tetap";
      diff.tetap += 1;
    } else {
      change.jenis = "berubah";
      change.dari = current;
      diff.berubah += 1;
    }
    diff.perubahan.push(change);
  }

  diff.perubahan.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  return diff;
}

/**
 * How many rows applying this diff would touch.
 *
 * Unchanged rows are still written — the upsert is idempotent, and skipping
 * them would leave their batch reference pointing at an older import, which
 * makes provenance name the wrong file as the source of the number.
 */
export function writesOf(diff: SAImportDiff): number {
  return diff.baru + diff.berubah + diff.tetap;
}
