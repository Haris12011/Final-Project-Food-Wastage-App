import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.REACT_APP_GEMINI_API_KEY;

if (!apiKey) {
  console.warn("Gemini API key missing. Check REACT_APP_GEMINI_API_KEY in .env");
}

const genAI = new GoogleGenerativeAI(apiKey);

function cleanJsonText(text) {
  return text
    .replace(/```json/g, "")
    .replace(/```JSON/g, "")
    .replace(/```/g, "")
    .trim();
}

function safeJsonParse(text, fallback) {
  try {
    return JSON.parse(cleanJsonText(text));
  } catch (error) {
    console.error("Gemini JSON parse error:", error);
    console.log("Raw Gemini text:", text);
    return fallback;
  }
}

function getMimeTypeFromBase64(base64Image) {
  if (base64Image.startsWith("/9j/")) return "image/jpeg";
  if (base64Image.startsWith("iVBORw0KGgo")) return "image/png";
  if (base64Image.startsWith("UklGR")) return "image/webp";

  return "image/jpeg";
}

function validateApiKey() {
  if (!apiKey) {
    throw new Error(
      "Gemini key is missing. Add REACT_APP_GEMINI_API_KEY in your .env file and restart React."
    );
  }
}

export async function analyzeFoodImage(base64Image) {
  validateApiKey();

  if (!base64Image) {
    throw new Error("Image data is missing.");
  }

  const mimeType = getMimeTypeFromBase64(base64Image);

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
  });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: base64Image,
      },
    },
    `
You are helping a food waste sharing app.

Analyze the uploaded image.

Return ONLY valid JSON. Do not use markdown.

{
  "item_name": "short food name",
  "category": "Fruit | Vegetables | Bakery | Cooked Food | Dairy | Packaged Food | Drinks | Other",
  "description": "short useful description"
}

Rules:
- Use only one allowed category.
- If the food is unclear, use category "Other".
- Keep description under 25 words.
`,
  ]);

  const text = result.response.text();

  return safeJsonParse(text, {
    item_name: "Unknown Food",
    category: "Other",
    description: "Food item detected, but AI response could not be parsed clearly.",
  });
}

export async function moderateFoodImage(base64Image) {
  validateApiKey();

  if (!base64Image) {
    throw new Error("Image data is missing.");
  }

  const mimeType = getMimeTypeFromBase64(base64Image);

  const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
  });

  const result = await model.generateContent([
    {
      inlineData: {
        mimeType,
        data: base64Image,
      },
    },
    `
Analyze this uploaded image for a food-sharing app.

Return ONLY valid JSON. Do not use markdown.

{
  "is_food": true,
  "safe_to_share": true,
  "reason": "short reason"
}

Rules:
- If the image is not food, set is_food to false.
- If the food looks spoiled, dirty, unsafe, inappropriate, or unclear, set safe_to_share to false.
- If the food looks acceptable for sharing, set both is_food and safe_to_share to true.
- Keep reason under 20 words.
`,
  ]);

  const text = result.response.text();

  return safeJsonParse(text, {
    is_food: false,
    safe_to_share: false,
    reason: "AI moderation response could not be understood.",
  });
}