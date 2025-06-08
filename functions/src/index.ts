import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as express from "express";
import * as cors from "cors";
import * as Busboy from "busboy";
import * as pdfParse from "pdf-parse";
import * as mammoth from "mammoth";
import { GoogleGenerativeAI } from "@google/genai";

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));

const geminiApiKey = functions.config().gemini.key;

app.post("/api/analyze", async (req, res) => {
  try {
    const busboy = Busboy({ headers: req.headers });
    const fields: any = {};
    const fileBuffers: Buffer[] = [];

    busboy.on("field", (fieldname, val) => {
      fields[fieldname] = val;
    });

    busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
      file.on("data", (data) => {
        fileBuffers.push(data);
      });
    });

    busboy.on("finish", async () => {
      try {
        const buffer = Buffer.concat(fileBuffers);
        let extractedText = "";

        if (
          fields.filetype === "application/pdf" ||
          fields.filetype === "pdf"
        ) {
          const pdfData = await pdfParse(buffer);
          extractedText = pdfData.text;
        } else if (
          fields.filetype ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          fields.filetype === "docx"
        ) {
          const result = await mammoth.extractRawText({ buffer });
          extractedText = result.value;
        } else {
          throw new Error("Unsupported file type");
        }

        // Configura Gemini
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        // Prepara prompt para analizar según Bloom
        const prompt = `
Extrae y clasifica cada pregunta o ítem del siguiente texto según los seis niveles de la Taxonomía de Bloom (Recordar, Comprender, Aplicar, Analizar, Evaluar, Crear). 
Devuelve una respuesta en JSON con el conteo y porcentaje de preguntas para cada nivel, y una lista breve con los ejemplos clasificados.
Texto:
${extractedText}
`;

        const result = await model.generateContent(prompt);
        const responseText = await result.response.text();
        const jsonResponse = JSON.parse(responseText);

        // Guarda análisis en Firestore
        const docRef = await db.collection("analisisInstrumentos").add({
          asignatura: fields.asignatura,
          nivel: fields.nivel,
          resultado: jsonResponse,
          fecha: admin.firestore.FieldValue.serverTimestamp(),
        });

        res.status(200).json({
          success: true,
          docId: docRef.id,
          resultado: jsonResponse,
        });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    req.pipe(busboy);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Exporta como Cloud Function
exports.api = functions.https.onRequest(app);
