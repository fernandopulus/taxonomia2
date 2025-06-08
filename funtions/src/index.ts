// Instrucciones de Configuración y Despliegue (EN ESPAÑOL):
//
// 1. ESTRUCTURA DE CARPETAS:
//    Asegúrate de que este código esté dentro de una estructura de proyecto Firebase Functions:
//    tu-proyecto-firebase/
//    ├── functions/
//    │   ├── src/
//    │   │   └── index.ts  (este archivo)
//    │   ├── package.json
//    │   ├── tsconfig.json
//    │   └── .eslintrc.js (opcional, para linting)
//    ├── firebase.json
//    └── ...otros archivos de Firebase
//
// 2. INSTALACIÓN DE DEPENDENCIAS:
//    Navega a la carpeta `functions` en tu terminal:
//    cd functions
//    Ejecuta:
//    npm install
//
// 3. CONFIGURACIÓN DE LA CLAVE API DE GEMINI:
//    Necesitas configurar tu clave API de Gemini como una variable de entorno en Firebase.
//    Reemplaza `TU_API_KEY_DE_GEMINI` con tu clave real.
//    Ejecuta en tu terminal (requiere Firebase CLI logueado y proyecto seleccionado):
//    firebase functions:config:set gemini.key="TU_API_KEY_DE_GEMINI"
//
//    Para probar localmente con el emulador de Firebase (`firebase emulators:start`):
//    Después de ejecutar el comando anterior, puedes obtener la configuración para el emulador:
//    firebase functions:config:get > .runtimeconfig.json
//    (Este archivo `.runtimeconfig.json` se crea en la carpeta `functions` y no debe subirse a GitHub).
//
// 4. COMPILAR TYPESCRIPT (si es la primera vez o después de cambios):
//    Dentro de la carpeta `functions`:
//    npm run build
//    Esto compilará el código de `src/index.ts` a `lib/index.js`.
//
// 5. DESPLIEGUE A FIREBASE:
//    Desde la raíz de tu proyecto Firebase (no dentro de la carpeta `functions`):
//    firebase deploy --only functions
//
//    La URL del endpoint será algo como:
//    https://[REGION]-[ID-PROYECTO].cloudfunctions.net/api/analyze

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as express from 'express';
import * as cors from 'cors';
import * as Busboy from 'busboy';
import * as pdfParse from 'pdf-parse';
import * as mammoth from 'mammoth';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';

// --- Constantes ---
const BLOOM_TAXONOMY_LEVELS_ES: string[] = [
  "Recordar", "Comprender", "Aplicar", "Analizar", "Evaluar", "Crear",
];
// Cambiar a false para deshabilitar el guardado en Firestore
const GUARDAR_EN_FIRESTORE = true; 
const GEMINI_MODEL_NAME = 'gemini-2.5-flash-preview-04-17';

// --- Inicialización de Firebase Admin ---
try {
  admin.initializeApp();
} catch (e) {
  functions.logger.info("Firebase Admin SDK ya inicializado o error al inicializar:", e);
}
const db = admin.firestore();

// --- Configuración del cliente Gemini ---
let ai: GoogleGenAI | null = null;
try {
  // functions.config() solo está disponible en el entorno de Firebase Functions (desplegado o emulado con .runtimeconfig.json)
  // Puede fallar si se ejecuta fuera de ese contexto (ej. pruebas unitarias sin mockear)
  if (functions.config().gemini && functions.config().gemini.key) {
    ai = new GoogleGenAI({ apiKey: functions.config().gemini.key });
  } else if (process.env.GEMINI_API_KEY) { // Fallback para desarrollo local con .env si no se usa .runtimeconfig.json
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  } else {
    functions.logger.warn("Clave API de Gemini no encontrada en functions.config().gemini.key ni en process.env.GEMINI_API_KEY");
  }
} catch (error) {
    functions.logger.error("Error al inicializar GoogleGenAI. Asegúrate de que la configuración 'gemini.key' esté establecida.", error);
}


// --- Configuración de Express ---
const app = express();
app.use(cors({ origin: true })); // Habilita CORS. Considera restringir el origen en producción.

// --- Interfaz para datos del archivo ---
interface FileData {
  filename: string;
  data: Buffer;
  mimetype: string;
}

// --- Interfaz para el resultado del análisis de Bloom ---
interface AnalisisBloom {
  [nivelTaxonomico: string]: number;
}

// --- Helper para procesar la carga de archivos con Busboy ---
const processFileUpload = (req: functions.https.Request): Promise<{ fields: { [key: string]: string }, file: FileData | null }> => {
  return new Promise((resolve, reject) => {
    if (!req.headers['content-type'] || !req.headers['content-type'].startsWith('multipart/form-data')) {
      reject(new Error('Content-Type must be multipart/form-data'));
      return;
    }

    const busboy = Busboy({ headers: req.headers });
    const fields: { [key: string]: string } = {};
    let uploadedFile: FileData | null = null;

    busboy.on('field', (fieldname, val) => {
      fields[fieldname] = val;
    });

    busboy.on('file', (fieldname, fileStream, fileDetails) => {
      // Esperamos un campo de archivo llamado 'instrumentoFile'
      if (fieldname === 'instrumentoFile' && !uploadedFile) {
        const { filename, mimeType } = fileDetails;
        if (!filename) {
          // Si no hay nombre de archivo, puede ser un campo vacío, lo ignoramos.
          fileStream.resume();
          return;
        }
        const buffers: Buffer[] = [];
        fileStream.on('data', (data) => buffers.push(data));
        fileStream.on('end', () => {
          uploadedFile = { filename, data: Buffer.concat(buffers), mimetype: mimeType };
        });
        fileStream.on('error', (err) => {
          functions.logger.error("Error en el stream del archivo:", err);
          reject(new Error(`Error al leer el stream del archivo: ${err.message}`));
        });
      } else {
        fileStream.resume(); // Consumir otros archivos para que busboy no se atasque
      }
    });

    busboy.on('finish', () => {
      if (!uploadedFile && Object.keys(fields).length > 0) { // Se enviaron campos pero no el archivo esperado
          reject(new Error('No se adjuntó el archivo del instrumento (se esperaba en el campo "instrumentoFile").'));
          return;
      }
      if (uploadedFile && (!fields.asignatura || !fields.nivel)) {
        reject(new Error('Faltan los campos "asignatura" o "nivel" junto con el archivo.'));
        return;
      }
      resolve({ fields, file: uploadedFile });
    });

    busboy.on('error', (err) => {
        functions.logger.error("Error de Busboy:", err);
        reject(new Error(`Error al procesar el formulario: ${err.message}`));
    });
    
    // Firebase Functions llena req.rawBody para ciertos tipos de contenido.
    // Si no está, pipeamos req directamente.
    if (req.rawBody) {
      busboy.end(req.rawBody);
    } else {
      req.pipe(busboy);
    }
  });
};

// --- Helper para extraer texto del archivo ---
const extractTextFromFile = async (file: FileData): Promise<string> => {
  if (file.mimetype === 'application/pdf') {
    const data = await pdfParse(file.data);
    return data.text;
  } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.filename.endsWith('.docx')) {
    const result = await mammoth.extractRawText({ buffer: file.data });
    return result.value;
  } else if (file.mimetype === 'application/msword' || file.filename.endsWith('.doc')) {
    // Mammoth no soporta .doc directamente. Considerar alternativas o pedir .docx
    throw new Error('Formato de archivo .doc no soportado directamente. Por favor, use PDF o DOCX.');
  } else {
    throw new Error(`Tipo de archivo no soportado: ${file.mimetype}. Use PDF o DOCX.`);
  }
};

// --- Helper para parsear la respuesta JSON de Gemini ---
const parseGeminiJsonResponse = (jsonString: string): AnalisisBloom => {
  let cleanJsonString = jsonString.trim();
  const fenceRegex = /^```(?:json)?\s*\n?(.*?)\n?\s*```$/s;
  const match = cleanJsonString.match(fenceRegex);
  if (match && match[1]) {
    cleanJsonString = match[1].trim();
  }
  try {
    const parsed = JSON.parse(cleanJsonString);
    // Validar que el objeto tiene la estructura esperada
    const result: AnalisisBloom = {};
    let isValid = true;
    BLOOM_TAXONOMY_LEVELS_ES.forEach(level => {
      if (typeof parsed[level] === 'number') {
        result[level] = parsed[level];
      } else {
        // Si un nivel no viene o no es número, asumimos 0, pero logueamos
        result[level] = 0;
        if (parsed[level] !== undefined) {
             functions.logger.warn(`Nivel '${level}' en respuesta de Gemini no es un número: ${parsed[level]}. Se usará 0.`);
        }
      }
    });
    // Podríamos añadir una validación más estricta si es necesario.
    return result;
  } catch (e: any) {
    functions.logger.error("Fallo al parsear JSON de Gemini:", cleanJsonString, e.message);
    throw new Error(`La respuesta de la IA no es un JSON válido o no tiene el formato esperado. Error: ${e.message}`);
  }
};


// --- Ruta de Análisis ---
app.post('/analyze', async (req, res) => {
  if (!ai) {
    functions.logger.error("Gemini AI client no está inicializado. Verifica la configuración de la API Key.");
    return res.status(500).json({ error: "Servicio de IA no configurado correctamente." });
  }

  try {
    const { fields, file } = await processFileUpload(req);

    if (!file) {
      return res.status(400).json({ error: "Archivo del instrumento no proporcionado o inválido." });
    }
    if (!fields.asignatura || !fields.nivel) {
      return res.status(400).json({ error: "Los campos 'asignatura' y 'nivel' son requeridos." });
    }

    functions.logger.info(`Procesando archivo: ${file.filename}, Asignatura: ${fields.asignatura}, Nivel: ${fields.nivel}`);

    const extractedText = await extractTextFromFile(file);
    if (!extractedText.trim()) {
        return res.status(400).json({ error: "El archivo parece estar vacío o no se pudo extraer texto." });
    }
    
    functions.logger.info(`Texto extraído (primeros 200 caracteres): ${extractedText.substring(0, 200)}...`);

    const systemInstruction = `Eres un asistente pedagógico experto en la Taxonomía de Bloom.
Tu tarea es analizar el texto de un instrumento de evaluación que te proporcionaré.
Debes identificar y contar las preguntas que corresponden a cada uno de los siguientes niveles de la Taxonomía de Bloom: ${BLOOM_TAXONOMY_LEVELS_ES.join(', ')}.
Responde ÚNICAMENTE con un objeto JSON. El objeto debe tener claves correspondientes a cada nivel de Bloom (exactamente como se listan) y el valor de cada clave debe ser el número de preguntas encontradas para ese nivel.
Si no encuentras preguntas para un nivel, asigna 0. No incluyas explicaciones adicionales, solo el JSON.
Formato JSON esperado:
{
  "Recordar": <número>,
  "Comprender": <número>,
  "Aplicar": <número>,
  "Analizar": <número>,
  "Evaluar": <número>,
  "Crear": <número>
}`;

    const userPrompt = `Aquí está el texto del instrumento de evaluación para analizar:
---
${extractedText}
---
Por favor, proporciona el análisis en el formato JSON especificado.`;

    const safetySettings = [
      { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ];
    
    const geminiResponse = await ai.models.generateContent({
        model: GEMINI_MODEL_NAME,
        contents: [{ role: "user", parts: [{text: userPrompt}] }],
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            temperature: 0.2, // Temperatura baja para respuestas más deterministas y factuales
            safetySettings,
        }
    });
    
    const analisisBloom = parseGeminiJsonResponse(geminiResponse.text);

    const resultadoFinal: any = {
      // id se asignará después si se guarda en Firestore, o un UUID si no.
      nombreArchivo: file.filename,
      asignatura: fields.asignatura,
      nivel: fields.nivel,
      fechaAnalisis: new Date().toISOString(),
      analisisBloom,
    };

    if (GUARDAR_EN_FIRESTORE) {
      const docRef = await db.collection('analisisInstrumentos').add({
        ...resultadoFinal,
        // textoExtraido: extractedText, // Opcional: guardar el texto para auditoría
        fechaCreacionFirestore: admin.firestore.FieldValue.serverTimestamp(), // Para ordenar/filtrar por fecha de creación
      });
      resultadoFinal.id = docRef.id;
      functions.logger.info(`Análisis guardado en Firestore con ID: ${docRef.id}`);
    } else {
      resultadoFinal.id = admin.firestore().collection('_').doc().id; // Generar un ID temporal si no se guarda
    }
    
    return res.status(200).json(resultadoFinal);

  } catch (error: any) {
    functions.logger.error("Error en el endpoint /analyze:", error.message, error.stack);
    // Determinar el código de estado HTTP basado en el tipo de error
    if (error.message.includes("Content-Type must be multipart/form-data") ||
        error.message.includes("No se adjuntó el archivo") ||
        error.message.includes("Faltan los campos") ||
        error.message.includes("Tipo de archivo no soportado") ||
        error.message.includes("El archivo parece estar vacío")) {
      return res.status(400).json({ error: "Error en la solicitud: " + error.message });
    }
    if (error.message.includes("La respuesta de la IA no es un JSON válido")) {
        return res.status(502).json({ error: "Error de comunicación con el servicio de IA: " + error.message });
    }
    // Error genérico del servidor
    return res.status(500).json({ error: "Error interno del servidor al procesar el instrumento.", details: error.message });
  }
});

// Exportar la API de Express como una función de Firebase
// Ajusta la región, timeout y memoria según tus necesidades.
export const api = functions.region('us-central1') 
  .runWith({ timeoutSeconds: 300, memory: '1GB' })
  .https.onRequest(app);
