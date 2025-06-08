
import type { Instrumento } from '../types';

const STORAGE_KEY = 'analisisInstrumentosHistory_LIR';

export const loadInstrumentosFromStorage = (): Instrumento[] => {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
      const parsedData = JSON.parse(storedData) as Instrumento[];
      // Basic validation if needed
      if (Array.isArray(parsedData)) {
        return parsedData;
      }
    }
  } catch (error) {
    console.error("Error loading data from local storage:", error);
  }
  return [];
};

export const saveInstrumentosToStorage = (instrumentos: Instrumento[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(instrumentos));
  } catch (error) {
    console.error("Error saving data to local storage:", error);
  }
};
