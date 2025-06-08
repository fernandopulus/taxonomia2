
export interface AnalisisBloom {
  [nivelTaxonomico: string]: number; // e.g., "Recordar": 20 (percentage or count representing questions)
}

export interface Instrumento {
  id: string;
  nombreArchivo: string;
  asignatura: string;
  nivel: string;
  fechaAnalisis: string; // ISO string date
  analisisBloom: AnalisisBloom;
}

export interface BloomLevelData {
  name: string;
  questions: number;
}
