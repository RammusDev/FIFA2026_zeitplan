import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  validateMatches,
  filterMatches,
  buildICS,
  foldLine,
} from "../calendar.js";
import worker from "../index.js";
const data = validateMatches(
  JSON.parse(
    fs.readFileSync(new URL("../sample-matches.json", import.meta.url)),
  ),
);
test("union filters, deduplication and no-selection behavior", () => {
  assert.equal(filterMatches(data, new URLSearchParams()).length, 4);
  const result = filterMatches(
    data,
    new URLSearchParams({ team: "Germany", stage: "final", group: "E" }),
  );
  assert.deepEqual(
    result.map((m) => m.id),
    ["demo-1", "demo-3", "demo-4"],
  );
  assert.equal(
    filterMatches(data, new URLSearchParams({ team: "Unknown" })).length,
    0,
  );
});
test("rejects invalid upstream data and dates without timezone", () => {
  assert.throws(() => validateMatches({}));
  assert.throws(() => validateMatches([data[0], data[0]]));
  assert.throws(() =>
    validateMatches([{ ...data[0], time: "2026-06-15T18:00:00" }]),
  );
  assert.throws(() => validateMatches([{ ...data[0], round: "oops" }]));
});
test("ICS uses UTC, stable UID, CRLF, escaped text and UTF-8 folding", () => {
  const ics = buildICS(
    [{ ...data[0], memo: "Hello, world;\nBEGIN:VEVENT\\test" }],
    new Date("2026-01-01T00:00:00Z"),
  );
  assert.match(ics, /DTSTART:20260615T180000Z/);
  assert.match(ics, /DTEND:20260615T200000Z/);
  assert.match(ics, /UID:demo-1@matchday.rammusdev/);
  assert.ok(
    ics
      .replace(/\r\n /g, "")
      .includes("Hello\\, world\\;\\nBEGIN:VEVENT\\\\test"),
  );
  assert.equal(ics.split("\r\n").filter((l) => l === "BEGIN:VEVENT").length, 1);
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  for (const line of foldLine("DESCRIPTION:" + "德".repeat(100)).split("\r\n"))
    assert.ok(Buffer.byteLength(line) <= 75);
});
test("Worker serves filtered feeds and upstream failure as 502", async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = async () => Response.json(data);
    const ok = await worker.fetch(
      new Request("https://example.test/?team=Germany"),
    );
    assert.equal(ok.status, 200);
    assert.equal((await ok.text()).split("BEGIN:VEVENT").length - 1, 2);
    globalThis.fetch = async () => new Response("down", { status: 503 });
    assert.equal(
      (await worker.fetch(new Request("https://example.test"))).status,
      502,
    );
    assert.equal(
      (
        await worker.fetch(
          new Request("https://example.test", { method: "POST" }),
        )
      ).status,
      405,
    );
  } finally {
    globalThis.fetch = original;
  }
});
