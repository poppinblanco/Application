import {
  collection, doc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy, setDoc, getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';

const col = (name) => collection(db, name);

export function watchCollection(name, orderField, cb) {
  const q = orderField ? query(col(name), orderBy(orderField)) : col(name);
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export const addItem = (name, data) => addDoc(col(name), { ...data, createdAt: new Date().toISOString() });
export const updateItem = (name, id, data) => updateDoc(doc(db, name, id), data);
export const deleteItem = (name, id) => deleteDoc(doc(db, name, id));

export async function getSettings() {
  const snap = await getDoc(doc(db, 'settings', 'main'));
  return snap.exists() ? snap.data() : null;
}
export const saveSettings = (data) => setDoc(doc(db, 'settings', 'main'), data, { merge: true });
export function watchSettings(cb) {
  return onSnapshot(doc(db, 'settings', 'main'), (snap) => cb(snap.exists() ? snap.data() : {}));
}

export async function uploadPhoto(pathPrefix, file) {
  const path = `${pathPrefix}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const r = ref(storage, path);
  const blob = await compressIfImage(file);
  await uploadBytes(r, blob, { contentType: file.type });
  const url = await getDownloadURL(r);
  return { url, path };
}

export async function deletePhoto(path) {
  try { await deleteObject(ref(storage, path)); } catch (e) { /* already gone */ }
}

function compressIfImage(file) {
  if (!file.type.startsWith('image/')) return Promise.resolve(file);
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1280;
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob || file), 'image/jpeg', 0.78);
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}
