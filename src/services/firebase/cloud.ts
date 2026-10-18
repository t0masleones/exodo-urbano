import type { FirebaseApp } from 'firebase/app';
// "lite": só leitura/escrita via REST, sem conexão aberta nem cache local.
// O jogo já é local-first, então isso basta e economiza bateria, dados e custo.
import { connectFirestoreEmulator, deleteDoc, doc, getDoc, getFirestore, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore/lite';
import type { CloudSaveRecord, CloudSaveStore } from '../account/types';

export function createCloudStore(app: FirebaseApp, useEmulator: boolean): CloudSaveStore {
  const db = getFirestore(app);
  if (useEmulator) connectFirestoreEmulator(db, '127.0.0.1', 8080);

  return {
    async get(uid) {
      const snap = await getDoc(doc(db, 'saves', uid));
      if (!snap.exists()) return null;
      const d = snap.data();
      const updatedAt = d.updatedAt instanceof Timestamp ? d.updatedAt.toMillis() : 0;
      if (typeof d.data !== 'string' || typeof d.saveId !== 'string' || typeof d.revision !== 'number' || typeof d.day !== 'number') return null;
      const rec: CloudSaveRecord = {
        schema: Number(d.schema) || 0,
        data: d.data,
        day: d.day,
        revision: d.revision,
        saveId: d.saveId,
        appVersion: String(d.appVersion ?? ''),
        updatedAt,
      };
      return rec;
    },

    async put(uid, rec) {
      // updatedAt é carimbado pelo servidor; as regras recusam qualquer outro valor.
      await setDoc(doc(db, 'saves', uid), { ...rec, updatedAt: serverTimestamp() });
    },

    async remove(uid) {
      await deleteDoc(doc(db, 'saves', uid));
    },
  };
}
