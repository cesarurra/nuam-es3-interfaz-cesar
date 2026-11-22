import crypto from "node:crypto";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { hashPassword } from "./auth.js";
import { createStore } from "./nibaldo-store.cjs";

const COLUMNS = Array.from({ length: 30 }, (_, i) => i + 8);

function buildSeedData() {
  const demoPasswordHash = hashPassword("DemoNuam2026!");

  const users = new Map([
    [
      "cesar@demo.local",
      {
        id: "u-broker-a",
        name: "Corredor A",
        email: "cesar@demo.local",
        role: "broker",
        tenantId: "tenant-a",
        passwordHash: demoPasswordHash
      }
    ],
    [
      "corredor.b@demo.local",
      {
        id: "u-broker-b",
        name: "Corredor B",
        email: "corredor.b@demo.local",
        role: "broker",
        tenantId: "tenant-b",
        passwordHash: demoPasswordHash
      }
    ],
    [
      "auditor@demo.local",
      {
        id: "u-auditor-1",
        name: "Auditor",
        email: "auditor@demo.local",
        role: "auditor",
        tenantId: "tenant-audit",
        passwordHash: demoPasswordHash
      }
    ]
  ]);

  const baseFactors = Object.fromEntries(COLUMNS.map((c) => [c, "0.00000000"]));
  baseFactors[8] = "0.52277431";
  baseFactors[9] = "0.17400052";
  baseFactors[11] = "0.30322517";

  const baseAmounts = Object.fromEntries(COLUMNS.map((c) => [c, "0.00000000"]));
  baseAmounts[8] = "192770580.00000000";
  baseAmounts[9] = "64161878.00000000";
  baseAmounts[11] = "111812860.00000000";
  baseAmounts[25] = "71298705.00000000";
  baseAmounts[30] = "15837333.00000000";

  const records = new Map([
    [
      "rec-a-1",
      {
        id: "rec-a-1",
        tenantId: "tenant-a",
        instrument: "DEMO-CESAR",
        sequence: "1",
        year: "2026",
        market: "Chile",
        origin: "Corredor",
        source: "Manual",
        paymentDate: "2026-11-17",
        registered: false,
        version: 1,
        amounts: { ...baseAmounts },
        factors: { ...baseFactors },
        updatedAt: "2026-11-17T18:00:00.000Z"
      }
    ],
    [
      "rec-b-1",
      {
        id: "rec-b-1",
        tenantId: "tenant-b",
        instrument: "OTRO-CORREDOR",
        sequence: "2",
        year: "2026",
        market: "Perú",
        origin: "Corredor",
        source: "Manual",
        paymentDate: "2026-11-17",
        registered: true,
        version: 1,
        amounts: { ...baseAmounts },
        factors: { ...baseFactors },
        updatedAt: "2026-11-17T18:05:00.000Z"
      }
    ],
    [
      "ref-bolsa-1",
      {
        id: "ref-bolsa-1",
        tenantId: "BOLSA",
        instrument: "REF-BOLSA",
        sequence: "1",
        year: "2026",
        market: "Chile",
        origin: "Bolsa",
        source: "Referencia",
        paymentDate: "2026-11-17",
        registered: true,
        version: 1,
        amounts: { ...baseAmounts },
        factors: { ...baseFactors },
        updatedAt: "2026-11-17T17:00:00.000Z"
      }
    ]
  ]);

  return { users, records };
}

export function createMemoryStore({ file } = {}) {
  const { users, records } = buildSeedData();
  let snapshot = { records: Object.fromEntries(records), audit: [] };
  if (file) {
    mkdirSync(dirname(file), { recursive: true });
    try {
      snapshot = JSON.parse(readFileSync(file, "utf8"));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (!snapshot?.records || Array.isArray(snapshot.records) || typeof snapshot.records !== "object" || !Array.isArray(snapshot.audit)) {
      throw new Error("El almacén local tiene un formato inválido.");
    }
  }
  const store = createStore({ ...snapshot, users: Object.fromEntries(users) }, {
    persist: file ? state => {
      const temporary = `${file}.${crypto.randomUUID()}.tmp`;
      try {
        writeFileSync(temporary, JSON.stringify(state), { encoding: "utf8", flag: "wx" });
        renameSync(temporary, file);
      } finally {
        rmSync(temporary, { force: true });
      }
    } : undefined
  });

  return {
    kind: file ? "json-local" : "memory",
    async findUserByEmail(email) {
      return store.read(state => state.users.find(user => user.email === email) || null);
    },
    async listRecords() {
      return store.read(state => state.records);
    },
    async getRecordById(id) {
      return store.read(state => state.records.find(record => record.id === id) || null);
    },
    async createRecord(record) {
      const id = record.id || `rec-${crypto.randomUUID()}`;
      const saved = { ...record, id };
      store.transaction(state => state.records.set(id, saved));
      return saved;
    },
    async updateRecord(record) {
      store.transaction(state => state.records.set(record.id, { ...record }));
      return record;
    },
    async deleteRecord(id) {
      store.transaction(state => state.records.delete(id));
    },
    async appendAudit(event) {
      const entry = {
        id: event.id || `aud-${crypto.randomUUID()}`,
        timestamp: event.timestamp || new Date().toISOString(),
        ...event
      };
      store.transaction(state => state.audit.push(entry));
      return entry;
    },
    async listAudit() {
      return store.read(state => state.audit);
    }
  };
}

export function createFirestoreStore(db, {
  recordsCollection = "nuam_records",
  auditCollection = "nuam_audit",
  usersCollection = "nuam_users"
} = {}) {
  if (!db || typeof db.collection !== "function") {
    throw new Error("Se requiere una instancia válida de Firestore.");
  }

  return {
    kind: "firestore",
    async findUserByEmail(email) {
      const snap = await db.collection(usersCollection).where("email", "==", email).limit(1).get();
      if (snap.empty) return null;
      const doc = snap.docs[0];
      return { id: doc.id, ...doc.data() };
    },
    async listRecords() {
      const snap = await db.collection(recordsCollection).get();
      return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    },
    async getRecordById(id) {
      const doc = await db.collection(recordsCollection).doc(id).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    },
    async createRecord(record) {
      const id = record.id || `rec-${crypto.randomUUID()}`;
      const payload = { ...record, id };
      await db.collection(recordsCollection).doc(id).set(payload);
      return payload;
    },
    async updateRecord(record) {
      await db.collection(recordsCollection).doc(record.id).set({ ...record }, { merge: false });
      return record;
    },
    async deleteRecord(id) {
      await db.collection(recordsCollection).doc(id).delete();
    },
    async appendAudit(event) {
      const id = event.id || `aud-${crypto.randomUUID()}`;
      const entry = {
        id,
        timestamp: event.timestamp || new Date().toISOString(),
        ...event
      };
      await db.collection(auditCollection).doc(id).set(entry);
      return entry;
    },
    async listAudit() {
      const snap = await db.collection(auditCollection).get();
      return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }
  };
}
