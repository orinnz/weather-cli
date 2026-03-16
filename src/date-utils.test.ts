import test from "node:test";
import assert from "node:assert/strict";

import { detectDateFromQuestion, parseIsoDate, resolveWhenToDate } from "./date-utils.js";

test("parseIsoDate validates YYYY-MM-DD", () => {
  assert.equal(parseIsoDate("2026-03-18") instanceof Date, true);
  assert.equal(parseIsoDate("2026/03/18"), null);
});

test("resolveWhenToDate resolves today and tomorrow", () => {
  const base = new Date(2026, 2, 17); // 2026-03-17 local
  assert.equal(resolveWhenToDate("today", base), "2026-03-17");
  assert.equal(resolveWhenToDate("tomorrow", base), "2026-03-18");
});

test("resolveWhenToDate resolves weekdays", () => {
  const base = new Date(2026, 2, 17); // Tuesday
  assert.equal(resolveWhenToDate("friday", base), "2026-03-20");
});

test("detectDateFromQuestion handles explicit date and today/tomorrow", () => {
  assert.equal(detectDateFromQuestion("Can I go out on 2026-03-20?"), "2026-03-20");
  assert.equal(detectDateFromQuestion("How about tomorrow?") !== null, true);
  assert.equal(detectDateFromQuestion("How about today?") !== null, true);
});
