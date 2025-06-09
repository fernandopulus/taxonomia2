import { getFirestore, collection, getDocs, addDoc, Timestamp } from "firebase/firestore";
import { app } from "../firebaseConfig";
import type { Instrumento } from "../types";

const db = getFirestore(app);

// Leer historial de Firestore
export async function fetchInstrumentos(): Promise<Instrumento[]> {
  const col = collection(db, "analisisInstrumentos");
  const snapshot = await getDocs(col);
  // Convierte timestamps de Firestore a string ISO si lo necesitas
  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      fechaAnalisis: (data.fechaAnalisis instanceof Timestamp) 
        ? data.fechaAnalisis.toDate().toISOString() 
        : (typeof data.fechaAnalisis === "string" ? data.fechaAnalisis : new Date().toISOString()),
    } as Instrumento;
  });
}

// Guardar un instrumento nuevo en Firestore
export async function saveInstrumento(instrumento: Instrumento) {
  const col = collection(db, "analisisInstrumentos");
  // No guardes el id, Firestore lo genera; y puedes agregar un timestamp exacto:
  const { id, ...data } = instrumento;
  await addDoc(col, {
    ...data,
    fechaAnalisis: instrumento.fechaAnalisis || new Date().toISOString(),
  });
}
