import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import OpenAI from "openai";

const apiKey = process.env.GEMINI_API_KEY;
const openAiKey = process.env.OPENAI_API_KEY;

export const getGeminiModel = () => {
  const key = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("Gemini API key is not set. Please configure it in Settings.");
  }
  return new GoogleGenAI({ apiKey: key });
};

export class GeminiError extends Error {
  constructor(public message: string, public code?: string, public details?: any) {
    super(message);
    this.name = "GeminiError";
  }
}

function handleGeminiError(error: any): never {
  console.error("Gemini API Error:", error);
  
  let message = error.message || "An unexpected error occurred";
  let status = error.status || error.code;
  let details = error;

  // Try to parse message if it's a JSON string (common in some SDK errors)
  if (typeof message === 'string' && message.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(message);
      if (parsed.error) {
        message = parsed.error.message || message;
        status = parsed.error.code || parsed.error.status || status;
        details = parsed.error;
      }
    } catch (e) {
      // Not valid JSON, keep original message
    }
  }
  
  if (message.includes("API_KEY_INVALID") || message.includes("API key not valid")) {
    throw new GeminiError("The provided API key is invalid. Please check your configuration.", "AUTH_ERROR");
  }
  
  if (message.includes("SAFETY") || message.includes("blocked")) {
    throw new GeminiError("The request was blocked by safety filters. Please try a different prompt.", "SAFETY_ERROR");
  }

  if (status === 400 || String(status) === "400" || message.includes("INVALID_ARGUMENT")) {
    throw new GeminiError("The request was invalid. Please check your input and try again.", "INVALID_REQUEST");
  }

  if (status === 403 || String(status) === "403" || message.includes("PERMISSION_DENIED")) {
    throw new GeminiError("Permission denied. Please check your API key permissions.", "PERMISSION_DENIED");
  }

  if (status === 404 || String(status) === "404" || message.includes("NOT_FOUND")) {
    throw new GeminiError("The requested resource was not found.", "NOT_FOUND");
  }

  if (status === 429 || String(status) === "429" || message.includes("quota") || message.includes("Rate limit")) {
    throw new GeminiError("Rate limit exceeded. The system is currently busy. Please wait about 30-60 seconds before trying again.", "RATE_LIMIT");
  }

  if (status === 500 || String(status) === "500" || message.includes("INTERNAL")) {
    throw new GeminiError("An internal server error occurred at the AI provider. Please try again later.", "INTERNAL_ERROR");
  }

  if (status === 503 || String(status) === "503" || message.includes("high demand") || message.includes("UNAVAILABLE") || message.includes("Service Unavailable")) {
    throw new GeminiError("The AI model is currently experiencing high demand. We are automatically retrying, but if this persists, please try again in a few moments.", "SERVICE_UNAVAILABLE");
  }

  if (message.includes("network") || message.includes("fetch")) {
    throw new GeminiError("Network error. Please check your internet connection.", "NETWORK_ERROR");
  }

  throw new GeminiError(message, "UNKNOWN_ERROR", details);
}

const getOpenAIClient = () => {
  if (!openAiKey) return null;
  return new OpenAI({ apiKey: openAiKey, dangerouslyAllowBrowser: true });
};

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

function isTransientError(error: any): boolean {
  const message = error.message || "";
  const status = error.status || error.code;
  
  // Check for JSON string in message
  let parsedMessage = message;
  let parsedStatus = status;
  if (typeof message === 'string' && message.trim().startsWith('{')) {
    try {
      const parsed = JSON.parse(message);
      if (parsed.error) {
        parsedMessage = parsed.error.message || message;
        parsedStatus = parsed.error.code || parsed.error.status || status;
      }
    } catch (e) {}
  }

  const isRateLimit = parsedStatus === 429 || String(parsedStatus) === "429" || 
                     parsedMessage.includes("429") || parsedMessage.includes("quota") || 
                     parsedMessage.includes("Rate limit");
  
  const isServiceUnavailable = parsedStatus === 503 || String(parsedStatus) === "503" || 
                               parsedMessage.includes("high demand") || 
                               parsedMessage.includes("UNAVAILABLE") || 
                               parsedMessage.includes("Service Unavailable");

  return isRateLimit || isServiceUnavailable;
}

export async function chatWithGemini(message: string, history: any[] = [], selectedModel?: string) {
  const geminiModels = selectedModel 
    ? [selectedModel, "gemini-3.1-pro-preview", "gemini-3-flash-preview", "gemini-flash-lite-latest"]
    : ["gemini-3.1-pro-preview", "gemini-3-flash-preview", "gemini-flash-lite-latest"];
  
  // Remove duplicates while preserving order
  const uniqueGeminiModels = Array.from(new Set(geminiModels));
  let lastError: any = null;

  // Try Gemini models first
  for (let i = 0; i < uniqueGeminiModels.length; i++) {
    const model = uniqueGeminiModels[i];
    try {
      const ai = getGeminiModel();
      const chat = ai.chats.create({
        model: model,
        config: {
          systemInstruction: "You are mova ai, an advanced multimodal AI system. You are precise, analytical, and strategic. When asked to create content (like songs, poems, or stories), provide only the title and the content itself without any conversational filler or explanations. For songs, clearly separate and label sections like Verse, Chorus, Pre-Chorus, etc. Do not use Markdown symbols like '#' or '*' in your output. Maintain a professional and confident tone.",
        },
      });

      const response = await chat.sendMessage({ message });
      if (!response.text) {
        throw new GeminiError("The model returned an empty response.", "EMPTY_RESPONSE");
      }
      return response.text;
    } catch (error: any) {
      lastError = error;
      const isRetryable = isTransientError(error);
      
      if (!isRetryable) {
        const errMsg = error.message || "";
        // If it's a fatal error (like auth or safety), don't bother with other Gemini models
        if (errMsg.includes("API_KEY_INVALID")) break;
        handleGeminiError(error);
      }
      
      console.warn(`Gemini Model ${model} failed, trying next...`);
      await delay(1000);
    }
  }

  // If all Gemini models fail, try OpenAI as fallback
  const openai = getOpenAIClient();
  if (openai) {
    console.info("All Gemini models failed or busy. Attempting OpenAI fallback...");
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are mova ai, an advanced multimodal AI system. You are precise, analytical, and strategic. When asked to create content (like songs, poems, or stories), provide only the title and the content itself without any conversational filler or explanations. For songs, clearly separate and label sections like Verse, Chorus, Pre-Chorus, etc. Do not use Markdown symbols like '#' or '*' in your output. Maintain a professional and confident tone." },
          ...history.map(h => ({ 
            role: (h.role === 'user' ? 'user' : 'assistant') as "user" | "assistant", 
            content: h.content 
          })),
          { role: "user", content: message }
        ],
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error("OpenAI returned an empty response.");
      }
      return responseText;
    } catch (oaError: any) {
      console.error("OpenAI fallback also failed:", oaError);
      // If OpenAI also fails, throw the original Gemini error or a combined one
      handleGeminiError(lastError || oaError);
    }
  }

  handleGeminiError(lastError);
}

async function generateImageWithRetry(ai: any, modelName: string, prompt: string, retries = 5): Promise<GenerateContentResponse> {
  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [{ text: prompt }],
      },
    });
    return response;
  } catch (error: any) {
    if (isTransientError(error) && retries > 0) {
      const delayTime = (6 - retries) * 2000;
      console.warn(`Transient error, retrying in ${delayTime}ms... (${retries} retries left)`);
      await delay(delayTime);
      return generateImageWithRetry(ai, modelName, prompt, retries - 1);
    }
    throw error;
  }
}

export async function generateImage(prompt: string, model: string = "gemini-2.5-flash-image") {
  try {
    const ai = getGeminiModel();
    
    // Handle Imagen models differently
    if (model.startsWith("imagen-")) {
      const response = await ai.models.generateImages({
        model: model,
        prompt: prompt,
        config: {
          numberOfImages: 1,
          aspectRatio: "1:1",
        },
      });
      
      const generatedImageB64 = response.generatedImages[0].image.imageBytes;
      return { generatedImageB64, textResponse: "Image generated using Imagen." };
    }

    // Handle Nano Banana series
    const response = await generateImageWithRetry(ai, model, prompt);

    let generatedImageB64: string | null = null;
    let textResponse: string = "";

    const candidates = response.candidates || [];
    if (candidates.length === 0) {
      throw new GeminiError("No image was generated. The request might have been blocked.", "NO_CANDIDATES");
    }

    for (const part of candidates[0].content.parts || []) {
      if (part.inlineData) {
        generatedImageB64 = part.inlineData.data;
      } else if (part.text) {
        textResponse += part.text;
      }
    }

    return { generatedImageB64, textResponse };
  } catch (error) {
    handleGeminiError(error);
  }
}

export async function editImage(imageB64: string, prompt: string, model: string = "gemini-2.5-flash-image", mimeType: string = "image/png") {
  let attempts = 0;
  const maxAttempts = 2;
  
  while (attempts < maxAttempts) {
    try {
      const ai = getGeminiModel();
      const response = await ai.models.generateContent({
        model: model,
        contents: {
          parts: [
            {
              inlineData: {
                data: imageB64,
                mimeType: mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      });

      let editedImageB64: string | null = null;
      let textResponse: string = "";

      const candidates = response.candidates || [];
      if (candidates.length === 0) {
        throw new GeminiError("No image was generated. The request might have been blocked.", "NO_CANDIDATES");
      }

      for (const part of candidates[0].content.parts || []) {
        if (part.inlineData) {
          editedImageB64 = part.inlineData.data;
        } else if (part.text) {
          textResponse += part.text;
        }
      }

      return { editedImageB64, textResponse };
    } catch (error: any) {
      attempts++;
      if (isTransientError(error) && attempts < maxAttempts) {
        const delayTime = attempts * 2000;
        console.warn(`Image edit transient error, retrying in ${delayTime}ms...`);
        await delay(delayTime);
        continue;
      }
      handleGeminiError(error);
    }
  }
}

export async function analyzeFile(fileB64: string, prompt: string, mimeType: string = "image/png") {
  const models = ["gemini-3-flash-preview", "gemini-2.5-flash-image"];
  let lastError: any = null;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const ai = getGeminiModel();
      const response = await ai.models.generateContent({
        model: model,
        contents: {
          parts: [
            {
              inlineData: {
                data: fileB64,
                mimeType: mimeType,
              },
            },
            {
              text: prompt || "Analyze this file in detail.",
            },
          ],
        },
      });

      if (!response.text) {
        throw new GeminiError("The model returned an empty analysis.", "EMPTY_RESPONSE");
      }
      return response.text;
    } catch (error: any) {
      lastError = error;
      if (!isTransientError(error) || i === models.length - 1) {
        handleGeminiError(error);
      }
      
      console.warn(`File analysis ${model} transient error, trying fallback in 1.5s...`);
      await delay(1500);
    }
  }
  handleGeminiError(lastError);
}
