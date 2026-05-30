import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// API Routes
app.post("/api/detect-watermark", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    const base64Data = image.split(",")[1];
    
    // Use Gemini to detect the watermark
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Data,
            },
          },
          {
            text: "Detect the Google Gemini watermark or any generative AI watermark in this image. Return the normalized [ymin, xmin, ymax, xmax] coordinates for the bounding box containing the watermark. If there are multiple, return a list. Return ONLY the JSON array of coordinates. Format: [[ymin, xmin, ymax, xmax], ...]",
          },
        ],
      },
    });

    const text = response.text;
    if (!text) {
      return res.json({ watermarks: [] });
    }
    const match = text.match(/\[\s*\[[\s\S]*?\]\s*\]/);
    if (!match) {
       // Try a more lenient match if the strict one fails
       const fallbackMatch = text.match(/\[[\s\d.,[\]\s]+\]/);
       if (fallbackMatch && fallbackMatch[0].includes('],')) {
         try {
           const parsed = JSON.parse(fallbackMatch[0]);
           if (Array.isArray(parsed) && (parsed.length === 0 || Array.isArray(parsed[0]))) {
             return res.json({ watermarks: parsed });
           }
         } catch (e) {}
       }
       return res.json({ watermarks: [] });
    }

    try {
      const watermarks = JSON.parse(match[0]);
      res.json({ watermarks });
    } catch (e) {
      res.json({ watermarks: [] });
    }
  } catch (error: any) {
    console.error("Detection error:", error);
    res.status(500).json({ error: error.message || "Failed to detect watermark" });
  }
});

app.post("/api/scan-nid", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No image provided" });
    }

    const base64Data = image.split(",")[1];
    const mimeType = image.split(";")[0].split(":")[1];

    const result = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType || "image/jpeg",
            },
          },
          {
            text: `Act as an expert OCR and NID analyst. Extract ALL data from this Bangladesh National ID card.
            
            PORTRAIT DETECTION:
            - Identify the person's portrait headshot ONLY.
            - Return bounding box as [ymin, xmin, ymax, xmax] (0-1000 scale).
            
            EXTRACT THESE FIELDS:
            - nameBangla: Bangla name
            - nameEnglish: English name
            - fatherName: Father's name
            - motherName: Mother's name
            - dob: Date of birth (DD MMM YYYY)
            - nidNumber: 10, 13, or 17 digit ID
            - gender: Male or Female
            - bloodGroup: A+, B+, O+, AB+, etc.
            - address: Full address if on card
            
            OUTPUT RULES:
            1. Return ONLY valid JSON.
            2. If a field is missing, use "".
            3. Do not include any text outside the JSON object.`,
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
      },
    });

    try {
      const text = result.text;
      if (!text) {
        return res.json({ watermarks: [] });
      }
      // Cleaner JSON extraction in case of markdown block formatting
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const cleanedJson = jsonMatch ? jsonMatch[0] : text;
      const data = JSON.parse(cleanedJson);
      
      // Ensure all required fields exist to prevent UI breakage
      const sanitizedData = {
        nameBangla: data.nameBangla || "",
        nameEnglish: data.nameEnglish || "",
        fatherName: data.fatherName || "",
        motherName: data.motherName || "",
        dob: data.dob || "",
        nidNumber: data.nidNumber || "",
        gender: data.gender || "",
        bloodGroup: data.bloodGroup || "",
        address: data.address || "",
        photoCropBox: Array.isArray(data.photoCropBox) ? data.photoCropBox : null
      };
      
      res.json(sanitizedData);
    } catch (e) {
      console.error("AI Response processing error:", e);
      res.status(500).json({ error: "Failed to extract card data. Please ensure the photo is clear." });
    }
  } catch (error: any) {
    console.error("NID scan error:", error);
    res.status(500).json({ error: error.message || "Server error during NID scan" });
  }
});

// Vite Middleware
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

start();
