import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as express from "express";
import * as cors from "cors";
import * as Busboy from "busboy";
import * as pdfParse from "pdf-parse";
import * as mammoth from "mammoth";
import fetch from "node-fetch";

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));

// Obtener la API key de Gemini
const geminiApiKey = functions.config().gemini?.key;

if (!geminiApiKey) {
  console.error("API key de Gemini no configurada");
}

app.post("/api/analyze", async (req: express.Request, res: express.Response) => {
  try {
    const busboy = Busboy({ headers: req.headers });
    const fields: { [key: string]: string } = {};
    const fileBuffers: Buffer[] = [];

    busboy.on("field", (fieldname: string, val: string) => {
      fields[fieldname] = val;
    });

    busboy.on("file", (fieldname: string, file: NodeJS.ReadableStream) => {
      file.on("data", (data: Buffer) => {
        fileBuffers.push(data);
      });
    });

    busboy.on("finish", async () => {
      try {
        const buffer = Buffer.concat(fileBuffers);
        let extractedText = "";

        // Verificar que hay contenido en el archivo
        if (buffer.length === 0) {
          throw new Error("El archivo está vacío");
        }

        // Procesar según el tipo de archivo
        if (
          fields.filetype === "application/pdf" ||
          fields.filetype === "pdf"
        ) {
          const pdfData = await pdfParse(buffer);
          extractedText = pdfData.text;
        } else if (
          fields.filetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          fields.filetype === "docx"
        ) {
          const result = await mammoth.extractRawText({ buffer });
          extractedText = result.value;
        } else {
          throw new Error(`Tipo de archivo no soportado: ${fields.filetype}`);
        }

        // Verificar que se extrajo texto
        if (!extractedText || extractedText.trim().length === 0) {
          throw new Error("No se pudo extraer texto del archivo");
        }

        // Crear el prompt para Gemini
        const prompt = `
Extrae y clasifica cada pregunta o ítem del siguiente texto según los seis niveles de la Taxonomía de Bloom (Recordar, Comprender, Aplicar, Analizar, Evaluar, Crear). 
Devuelve una respuesta en JSON con el conteo y porcentaje de preguntas para cada nivel, y una lista breve con los ejemplos clasificados.

Formato esperado:
{
  "resumen": {
    "total_preguntas": number,
    "niveles": {
      "recordar": { "cantidad": number, "porcentaje": number },
      "comprender": { "cantidad": number, "porcentaje": number },
      "aplicar": { "cantidad": number, "porcentaje": number },
      "analizar": { "cantidad": number, "porcentaje": number },
      "evaluar": { "cantidad": number, "porcentaje": number },
      "crear": { "cantidad": number, "porcentaje": number }
    }
  },
  "ejemplos": [
    { "pregunta": "texto de la pregunta", "nivel": "nivel asignado", "justificacion": "breve explicación" }
  ]
}

Texto a analizar:
${extractedText.substring(0, 8000)} ${extractedText.length > 8000 ? '...(texto truncado)' : ''}
`;

        let responseText = "";
        
        // Verificar que tenemos la API key
        if (!geminiApiKey) {
          throw new Error("API key de Gemini no configurada");
        }

        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${geminiApiKey}`,
            {
              method: "POST",
              headers: { 
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                contents: [{
                  parts: [{ text: prompt }]
                }],
                generationConfig: {
                  temperature: 0.1,
                  topK: 1,
                  topP: 1,
                  maxOutputTokens: 2048,
                }
              }),
            }
          );

          if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Error al llamar a Gemini: ${response.status} ${response.statusText} - ${errorBody}`);
          }

          const data = await response.json();
          
          if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
            throw new Error("Respuesta inválida de Gemini API");
          }

          responseText = data.candidates[0].content.parts[0].text;
        } catch (err) {
          console.error("Error en llamada a Gemini API:", err);
          throw new Error(`Error en llamada a Gemini API: ${err instanceof Error ? err.message : String(err)}`);
        }

        let jsonResponse: any;
        try {
          // Limpiar la respuesta de posibles caracteres de markdown
          const cleanedResponse = responseText.replace(/```json\n?|```\n?/g, '').trim();
          jsonResponse = JSON.parse(cleanedResponse);
        } catch (parseError) {
          console.error("Error al parsear JSON:", parseError);
          console.error("Respuesta original:", responseText);
          jsonResponse = { 
            error: "Gemini no devolvió JSON válido", 
            raw: responseText,
            parseError: parseError instanceof Error ? parseError.message : String(parseError)
          };
        }

        // Guardar análisis en Firestore
        const docRef = await db.collection("analisisInstrumentos").add({
          asignatura: fields.asignatura || "No especificada",
          nivel: fields.nivel || "No especificado",
          resultado: jsonResponse,
          textoExtraido: extractedText.substring(0, 1000), // Guardar muestra del texto
          fecha: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(200).json({
          success: true,
          docId: docRef.id,
          resultado: jsonResponse,
        });

      } catch (error) {
        console.error("Error en el procesamiento:", error);
        res.status(500).json({ 
          success: false, 
          error: error instanceof Error ? error.message : String(error) 
        });
      }
    });

    busboy.on("error", (error: Error) => {
      console.error("Error en busboy:", error);
      res.status(500).json({ 
        success: false, 
        error: `Error procesando el archivo: ${error.message}` 
      });
    });

    req.pipe(busboy);

  } catch (error) {
    console.error("Error general:", error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// Endpoint de salud para verificar que la función está funcionando
app.get("/api/health", (req: express.Request, res: express.Response) => {
  res.status(200).json({ 
    success: true, 
    message: "Firebase Function is running",
    timestamp: new Date().toISOString()
  });
});

export const api = functions.region("us-central1").https.onRequest(app);
