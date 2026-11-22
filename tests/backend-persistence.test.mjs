import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { createMemoryStore } from "../src/store.js";

test("el adaptador local vuelve a cargar registros, versiones y auditoría", async () => {
  const directory = await mkdtemp(join(tmpdir(), "nuam-test-"));
  try {
    const file = join(directory, "data.json");
    const original = createMemoryStore({ file });
    const seeded = await original.getRecordById("rec-a-1");
    const updated = { ...seeded, version: 2, factors: { ...seeded.factors, 34: "0.12500000" } };
    await original.updateRecord(updated);
    await original.appendAudit({ action: "RECORD_UPDATE", targetId: updated.id });

    const reopened = createMemoryStore({ file });
    assert.deepEqual(await reopened.getRecordById(updated.id), updated);
    assert.equal((await reopened.listAudit())[0].targetId, updated.id);
    await reopened.deleteRecord(updated.id);
    assert.equal(await createMemoryStore({ file }).getRecordById(updated.id), null);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
