import { describe, expect, it } from "vitest";
import {
  buildTargetDiff,
  parseTargetCsv,
  splitCsv,
  writesOf,
} from "./targetImport";

describe("parseTargetCsv", () => {
  it("skips the header without dropping the first of the month", () => {
    const parsed = parseTargetCsv("tanggal,target\n2026-09-01,350\n");

    expect(parsed.issues).toEqual([]);
    expect(parsed.rows).toEqual([{ tanggal: "2026-09-01", target: 350, baris: 2 }]);
  });

  it("reads a file with no header at all", () => {
    const parsed = parseTargetCsv("2026-09-01,350\n2026-09-02,300\n");

    expect(parsed.rows.map((r) => r.tanggal)).toEqual(["2026-09-01", "2026-09-02"]);
  });

  it("keeps a planned zero as a row", () => {
    // The whole reason a target of zero is allowed: Sundays and holidays are
    // stated obligations of nothing, and dropping them erases the statement.
    const parsed = parseTargetCsv("2026-09-06,0\n");

    expect(parsed.rows).toEqual([{ tanggal: "2026-09-06", target: 0, baris: 1 }]);
    expect(parsed.issues).toEqual([]);
  });

  it("treats a blank quantity as a question, not as zero", () => {
    const parsed = parseTargetCsv("2026-09-06,\n");

    expect(parsed.rows).toEqual([]);
    expect(parsed.issues).toHaveLength(1);
    expect(parsed.issues[0].alasan).toMatch(/kosong/);
  });

  it("reads the day-first dates a spreadsheet writes", () => {
    const parsed = parseTargetCsv("03/09/2026,350\n04-09-2026,300\n");

    expect(parsed.rows.map((r) => r.tanggal)).toEqual(["2026-09-03", "2026-09-04"]);
  });

  it("never reads a date month-first", () => {
    // 03/09/2026 is 3 September in every locale this serves. Reading it as
    // 9 March would move a third of the month's obligations to the wrong date,
    // silently and plausibly.
    const parsed = parseTargetCsv("03/09/2026,350\n");

    expect(parsed.rows[0].tanggal).toBe("2026-09-03");
  });

  it("refuses a day that does not exist rather than rolling it forward", () => {
    // `new Date(2026, 3, 31)` is 1 May. A parser built on it would accept a
    // typo and move the obligation to a date the file never mentioned.
    // On line 2, because line 1 is where a header is expected: an unreadable
    // first line is skipped silently, and putting the case there would prove
    // nothing about date validation.
    const parsed = parseTargetCsv("tanggal,target\n2026-04-31,350\n");

    expect(parsed.rows).toEqual([]);
    expect(parsed.issues[0].alasan).toMatch(/tanggal/);
  });

  it("tolerates the thousands separators an export writes", () => {
    // The comma form has to be quoted, because an unquoted comma is a field
    // separator before it is a separator of thousands — the same reading the
    // service's CSV reader takes.
    const parsed = parseTargetCsv('2026-09-01,1.250\n2026-09-02,"2,400"\n');

    expect(parsed.rows.map((r) => r.target)).toEqual([1250, 2400]);
  });

  it("refuses a negative target and names the cell", () => {
    const parsed = parseTargetCsv("2026-09-01,-50\n");

    expect(parsed.rows).toEqual([]);
    expect(parsed.issues[0].nilai).toBe("-50");
    expect(parsed.issues[0].alasan).toMatch(/negatif/);
  });

  it("reports a repeated date instead of letting the last line win", () => {
    const parsed = parseTargetCsv("2026-09-01,350\n2026-09-01,300\n");

    expect(parsed.rows).toEqual([{ tanggal: "2026-09-01", target: 350, baris: 1 }]);
    expect(parsed.issues[0].baris).toBe(2);
    expect(parsed.issues[0].alasan).toMatch(/lebih dari sekali/);
  });

  it("keeps every other date when one line is bad", () => {
    const parsed = parseTargetCsv(
      "tanggal,target\n2026-09-01,350\nkemarin,300\n2026-09-03,400\n",
    );

    expect(parsed.rows.map((r) => r.tanggal)).toEqual(["2026-09-01", "2026-09-03"]);
    expect(parsed.issues).toHaveLength(1);
    expect(parsed.issues[0].baris).toBe(3);
  });

  it("orders by date whatever order the file is in", () => {
    const parsed = parseTargetCsv("2026-09-03,400\n2026-09-01,350\n2026-09-02,300\n");

    expect(parsed.rows.map((r) => r.tanggal)).toEqual([
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
    ]);
  });

  it("ignores a byte-order mark rather than losing day one to it", () => {
    // Excel's "CSV UTF-8" writes one. Without stripping it the first date is
    // unparseable, and line 1 is silently skipped as a header.
    const parsed = parseTargetCsv("\uFEFF2026-09-01,350\n");

    expect(parsed.rows).toEqual([{ tanggal: "2026-09-01", target: 350, baris: 1 }]);
  });
});

describe("splitCsv", () => {
  it("keeps a comma inside quotes in one field", () => {
    expect(splitCsv('2026-09-01,350,"catatan, dengan koma"')).toEqual([
      ["2026-09-01", "350", "catatan, dengan koma"],
    ]);
  });

  it("reads a CRLF file as one record per line", () => {
    expect(splitCsv("2026-09-01,350\r\n2026-09-02,300\r\n")).toEqual([
      ["2026-09-01", "350"],
      ["2026-09-02", "300"],
    ]);
  });
});

describe("buildTargetDiff", () => {
  const parsed = parseTargetCsv(
    "tanggal,target\n2026-09-01,350\n2026-09-02,300\n2026-09-03,400\n",
  );

  it("separates a new date from one that moves and one that restates", () => {
    const diff = buildTargetDiff(
      parsed,
      new Map([
        ["2026-09-01", 350],
        ["2026-09-02", 250],
      ]),
    );

    expect(diff.tetap).toBe(1);
    expect(diff.berubah).toBe(1);
    expect(diff.baru).toBe(1);
    expect(diff.perubahan.find((c) => c.tanggal === "2026-09-02")).toEqual({
      tanggal: "2026-09-02",
      jenis: "berubah",
      dari: 250,
      menjadi: 300,
    });
  });

  it("leaves a date on record but absent from the file alone", () => {
    // A Base SA covering half a month is a partial statement, not an
    // instruction to erase the rest.
    const diff = buildTargetDiff(parsed, new Map([["2026-09-20", 500]]));

    expect(diff.perubahan.map((c) => c.tanggal)).not.toContain("2026-09-20");
    expect(diff.perubahan).toHaveLength(3);
  });

  it("counts an unreadable line as skipped", () => {
    const withIssue = parseTargetCsv("2026-09-01,350\nkemarin,300\n");
    const diff = buildTargetDiff(withIssue, new Map());

    expect(diff.dilewati).toBe(1);
    expect(diff.masalah).toHaveLength(1);
  });

  it("writes the unchanged rows too, so provenance names this file", () => {
    const diff = buildTargetDiff(
      parsed,
      new Map([
        ["2026-09-01", 350],
        ["2026-09-02", 300],
        ["2026-09-03", 400],
      ]),
    );

    expect(diff.berubah + diff.baru).toBe(0);
    expect(writesOf(diff)).toBe(3);
  });

  it("reports the calendar in order regardless of the file", () => {
    const shuffled = parseTargetCsv("2026-09-03,400\n2026-09-01,350\n");
    const diff = buildTargetDiff(shuffled, new Map());

    expect(diff.perubahan.map((c) => c.tanggal)).toEqual([
      "2026-09-01",
      "2026-09-03",
    ]);
  });
});
