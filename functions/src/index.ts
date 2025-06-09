import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import express from "express";
import cors from "cors";
import Busboy from "busboy";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
// @ts-ignore
const GoogleGenerativeAI = require("@google/genai");

admin.initializeApp();
const db = admin.firestore();

const app = express();
app.use(cors({ origin: true }));

const geminiApiKey = functions.config().gemini.key;

app.post("/api/analyze", async (req: any, res: any) => {
  try {
    const busboy = Busboy({ headers: req.headers });
    const fields: any = {};
    const fileBuffers: Buffer[] = [];

    busboy.on("field", (fieldname: any, val: any) => {
      fields[fieldname] = val;
    });

    busboy.on("file", (fieldname: any, file: any, filename: any, encoding: any, mimetype: any) => {
      file.on("data", (data: any) => {
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

        // Instancia Gemini usando require
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
      } catch (error: unknown) {
        res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
      }
    });

    req.pipe(busboy);
  } catch (error: unknown) {
    res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Exporta como Cloud Function
exports.api = functions.https.onRequest(app);
