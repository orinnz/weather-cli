import test from "node:test";
import assert from "node:assert/strict";

import { parseArgs } from "./index.js";

test("parseArgs reads ask/date-check/when/save flags", () => {
  const parsed = parseArgs([
    "Hanoi",
    "--ask",
    "Can I walk?",
    "--date",
    "2026-03-18",
    "--when",
    "tomorrow",
    "--save",
    "home"
  ]);

  assert.equal(parsed.location[0], "Hanoi");
  assert.equal(parsed.askQuestion, "Can I walk?");
  assert.equal(parsed.askDate, "2026-03-18");
  assert.equal(parsed.when, "tomorrow");
  assert.equal(parsed.saveAlias, "home");
});

test("parseArgs handles list-saved command", () => {
  const parsed = parseArgs(["--list-saved"]);
  assert.equal(parsed.listSaved, true);
});
