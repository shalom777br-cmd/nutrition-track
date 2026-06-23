import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit for base64 images and audio files
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Helper to extract mimeType and base64 string from data URL safely
function parseBase64Data(dataUrl: string) {
  if (typeof dataUrl !== "string" || !dataUrl.trim()) return null;
  
  let mimeType = "application/octet-stream";
  let rawData = "";

  if (dataUrl.startsWith("data:")) {
    const commaIndex = dataUrl.indexOf(",");
    if (commaIndex !== -1) {
      const header = dataUrl.substring(0, commaIndex);
      rawData = dataUrl.substring(commaIndex + 1).trim();
      const mimeMatch = header.match(/^data:([^;]+)/);
      mimeType = mimeMatch ? mimeMatch[1] : "application/octet-stream";
    } else {
      return null;
    }
  } else {
    const trimmed = dataUrl.trim();
    // Exclude plain HTTP links, mock placeholders, or uninitialized string representations
    if (
      trimmed.startsWith("http://") || 
      trimmed.startsWith("https://") || 
      trimmed === "undefined" || 
      trimmed === "null" ||
      trimmed === ""
    ) {
      return null;
    }
    rawData = trimmed;
  }

  // 1. Support Web Safe / Base64URL characters '-' and '_' by replacing them with '+' and '/'
  let standardBase64 = rawData.replace(/-/g, "+").replace(/_/g, "/");

  // 2. Remove all non-base64 characters (keep A-Z, a-z, 0-9, +, /, and =)
  let sanitized = standardBase64.replace(/[^A-Za-z0-9+/=]/g, "");

  // 3. Remove any existing trailing '=' padding to normalize and calculate correct padding
  let unpadded = sanitized.replace(/=+$/, "");

  // 4. Properly check length and pad with '=' up to a multiple of 4
  const mod = unpadded.length % 4;
  if (mod === 2) {
    sanitized = unpadded + "==";
  } else if (mod === 3) {
    sanitized = unpadded + "=";
  } else if (mod === 1) {
    // 1 residual character is invalid in base64. Return null or ignore.
    return null;
  } else {
    sanitized = unpadded;
  }

  // If base64 content is empty or invalid, return null
  if (!sanitized || sanitized.length === 0) {
    return null;
  }

  return {
    mimeType,
    data: sanitized
  };
}

// Lazy initialization of Gemini client to fail gracefully
let aiClient: GoogleGenAI | null = null;
function getGeminiClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("WARNING: GEMINI_API_KEY is not defined in the environment.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key || "MOCK_KEY_FOR_BUILD",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// API endpoint for analyzing receipt, food image, audio, or text
app.post("/api/analyze", async (req, res) => {
  try {
    const { text, receiptImage, receiptImages, foodImage, foodImages, audio, audioMimeType } = req.body;

    const parts: any[] = [];

    // 1. Add guidelines text prompt
    parts.push({
      text: `You are an expert OCR receipt parser, nutritional scientist, and health advisor.
Your goals are:
1. Parse the Portuguese receipt food items and their prices (in BRL/local currency) if provided.
2. Extract visible food items, meals, or food packaging from any plate food photo if provided.
3. Transcribe and extract food items described in the Portuguese, Japanese, or English voice audio or text if provided.
4. For EACH food/grocery item identified:
   - "originalName": Raw Portuguese or other language item name (e.g., 'pão francês', 'frango grelhado').
   - "japaneseName": A normalized, standardized, clean Japanese description mapping to standard food databases (e.g., 'パン（小麦）', '鶏肉（グリル塩焼き）').
   - "source": Identify which modal input it came from. MUST be one of: 'receipt', 'image', 'voice', or 'text'.
   - "price": The exact bill price (BRL or local) if extracted, or a realistic price estimate in BRL if it's on a shopping list, or 0 if it is a general plate meal photo with no specified purchase history.
   - "quantity": Parsed quantity/amount of item (e.g., '1 unit', '300g', '200ml').
   - "nutrition": Calculate energy (calories in kcal), macronutrients PFC (protein, fat, carbohydrates in grams), key vitamins (vitaminA in μg RAE, vitaminB1 in mg, vitaminB2 in mg, vitaminB6 in mg, vitaminB12 in μg, vitaminC in mg, vitaminD in μg, vitaminE in mg), minerals (iron in mg, calcium in mg, zinc in mg), and dietary fiber in grams (fiber) using standard nutritional tables (USDA, Open Food Facts, Taco / Brazilian food database). Estimate realistic values for the given quantity.

Additional user instruction:
Please provide a comprehensive friendly health advisory feedback (advisorFeedback) in Japanese summarizing the nutrition of the overall meal list, identifying potential deficiency or surplus based on standard adult recommendations, and giving supportive health advice.`
    });

    if (text) {
      parts.push({ text: `User written text/notes: ${text}` });
    }

    if (Array.isArray(receiptImages) && receiptImages.length > 0) {
      receiptImages.forEach((imgBase64, idx) => {
        const parsed = parseBase64Data(imgBase64);
        if (parsed) {
          parts.push({
            inlineData: {
              mimeType: parsed.mimeType,
              data: parsed.data
            }
          });
          parts.push({ text: `The image above (Receipt Image #${idx + 1}) is a portuguese store receipt/invoice of grocery or restaurant foods.` });
        }
      });
    } else if (receiptImage) {
      const parsed = parseBase64Data(receiptImage);
      if (parsed) {
        parts.push({
          inlineData: {
            mimeType: parsed.mimeType,
            data: parsed.data
          }
        });
        parts.push({ text: "The image above is a portuguese store receipt/invoice of grocery or restaurant foods." });
      }
    }

    if (Array.isArray(foodImages) && foodImages.length > 0) {
      foodImages.forEach((imgBase64, idx) => {
        const parsed = parseBase64Data(imgBase64);
        if (parsed) {
          parts.push({
            inlineData: {
              mimeType: parsed.mimeType,
              data: parsed.data
            }
          });
          parts.push({ text: `The image above (Image #${idx + 1}) is a photo of a meal plate or specific food items.` });
        }
      });
    } else if (foodImage) {
      const parsed = parseBase64Data(foodImage);
      if (parsed) {
        parts.push({
          inlineData: {
            mimeType: parsed.mimeType,
            data: parsed.data
          }
        });
        parts.push({ text: "The image above is a photo of a meal plate or specific food items." });
      }
    }

    if (audio) {
      const parsed = parseBase64Data(audio);
      if (parsed) {
        parts.push({
          inlineData: {
            mimeType: parsed.mimeType && parsed.mimeType !== "application/octet-stream" ? parsed.mimeType : (audioMimeType || "audio/webm"),
            data: parsed.data
          }
        });
        parts.push({ text: "The audio memo contains the user describing what they ate today in Portuguese, Japanese, or English. Please transcribe and parse." });
      }
    }

    if (parts.length <= 1) {
      return res.status(400).json({ error: "Please provide at least one input (text, receipt photo, plate photo, or voice memo)." });
    }

    const ai = getGeminiClient();
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is missing on the server. Please add your Gemini API Key in the Secrets panel."
      });
    }

    // Helper function to retry content generation with exponential backoff and multi-model fallback
    const generateContentWithRetry = async (aiClient: GoogleGenAI, maxRetries = 5, initialDelay = 1000) => {
      let attempt = 0;
      const modelsToTry = ["gemini-3.1-flash-lite", "gemini-flash-latest", "gemini-3.5-flash"];
      while (true) {
        const modelToUse = modelsToTry[attempt % modelsToTry.length];
        try {
          return await aiClient.models.generateContent({
            model: modelToUse,
            contents: { parts: parts },
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  items: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        originalName: { type: Type.STRING, description: "Detailed item name in original language as detected on receipt or prompt (e.g., 'pão francês', 'frango grelhado')" },
                        japaneseName: { type: Type.STRING, description: "Normalized healthy Japanese name representation (e.g. 'パン（小麦）', '鶏肉（グリル）')" },
                        source: { type: Type.STRING, description: "Input source of the food item. MUST be one of: 'receipt', 'image', 'voice', or 'text'" },
                        price: { type: Type.NUMBER, description: "Extracted or estimated cost in local billing currency (e.g. BRL on receipt). Default is 0." },
                        quantity: { type: Type.STRING, description: "Estimated or extracted quantity/portion size (e.g., '1個', '200g', '1人前')" },
                        nutrition: {
                          type: Type.OBJECT,
                          properties: {
                            calories: { type: Type.NUMBER, description: "Energy in calories (kcal)" },
                            protein: { type: Type.NUMBER, description: "Protein content in grams (g)" },
                            fat: { type: Type.NUMBER, description: "Fat content in grams (g)" },
                            carbohydrates: { type: Type.NUMBER, description: "Carbohydrates in grams (g)" },
                            vitaminA: { type: Type.NUMBER, description: "Vitamin A in mcg (RAE)" },
                            vitaminB1: { type: Type.NUMBER, description: "Vitamin B1 in mg" },
                            vitaminB2: { type: Type.NUMBER, description: "Vitamin B2 in mg" },
                            vitaminB6: { type: Type.NUMBER, description: "Vitamin B6 in mg" },
                            vitaminB12: { type: Type.NUMBER, description: "Vitamin B12 in mcg" },
                            vitaminC: { type: Type.NUMBER, description: "Vitamin C in mg" },
                            vitaminD: { type: Type.NUMBER, description: "Vitamin D in mcg" },
                            vitaminE: { type: Type.NUMBER, description: "Vitamin E in mg" },
                            iron: { type: Type.NUMBER, description: "Iron content in mg" },
                            calcium: { type: Type.NUMBER, description: "Calcium content in mg" },
                            zinc: { type: Type.NUMBER, description: "Zinc content in mg" },
                            fiber: { type: Type.NUMBER, description: "Dietary fiber content in grams (g)" }
                          },
                          required: [
                            "calories", "protein", "fat", "carbohydrates",
                            "vitaminA", "vitaminB1", "vitaminB2", "vitaminB6", "vitaminB12",
                            "vitaminC", "vitaminD", "vitaminE",
                            "iron", "calcium", "zinc", "fiber"
                          ]
                        }
                      },
                      required: ["originalName", "japaneseName", "source", "price", "quantity", "nutrition"]
                    }
                  },
                  advisorFeedback: { type: Type.STRING, description: "Helpful, detailed, inspiring advisory comments in Japanese summarizing the user's nutritional status and suggesting healthy choices." }
                },
                required: ["items", "advisorFeedback"]
              }
            }
          });
        } catch (err: any) {
          attempt++;
          const errStr = (JSON.stringify(err) + " " + (err?.message || "") + " " + String(err)).toLowerCase();
          const isRetryable = 
            errStr.includes("503") || 
            errStr.includes("429") || 
            errStr.includes("500") ||
            errStr.includes("unavailable") || 
            errStr.includes("high demand") ||
            errStr.includes("overburdened") ||
            errStr.includes("rate limit") ||
            errStr.includes("quota") ||
            err?.status === 503 || 
            err?.status === 429 ||
            err?.code === 503 ||
            err?.code === 429;

          if (isRetryable && attempt < maxRetries) {
            const delay = initialDelay * Math.pow(2, attempt - 1);
            console.warn(`Gemini API returned retryable error (attempt ${attempt}/${maxRetries}). Retrying with fallback in ${delay}ms...`, err);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          throw err;
        }
      }
    };

    const response = await generateContentWithRetry(ai);

    const jsonStr = response.text;
    if (!jsonStr) {
      throw new Error("Empty response received from Gemini model.");
    }

    let cleaned = jsonStr.trim();
    if (cleaned.startsWith("```")) {
      cleaned = cleaned.replace(/^```(?:json)?\n?/i, "");
      cleaned = cleaned.replace(/\n?```$/, "");
      cleaned = cleaned.trim();
    }

    const payload = JSON.parse(cleaned);
    return res.json(payload);

  } catch (error: any) {
    console.error("AI Analysis Error - Full details:", error);
    if (error && error.stack) {
      console.error("AI Analysis Error Stack:", error.stack);
    }
    return res.status(500).json({ 
      error: error.message || "Failed to process the request using Gemini AI.",
      stack: error.stack || "" 
    });
  }
});

// Setup Vite middleware or Static files for React UI
async function startServer() {
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
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
