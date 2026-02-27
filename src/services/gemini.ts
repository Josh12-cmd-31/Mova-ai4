import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

export const getGeminiModel = () => {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }
  return new GoogleGenAI({ apiKey });
};

export class GeminiError extends Error {
  constructor(public message: string, public code?: string, public details?: any) {
    super(message);
    this.name = "GeminiError";
  }
}

function handleGeminiError(error: any): never {
  console.error("Gemini API Error:", error);
  
  const message = error.message || "An unexpected error occurred";
  const status = error.status || error.code;
  
  if (message.includes("API_KEY_INVALID") || message.includes("API key not valid")) {
    throw new GeminiError("The provided API key is invalid. Please check your configuration.", "AUTH_ERROR");
  }
  
  if (message.includes("SAFETY") || message.includes("blocked")) {
    throw new GeminiError("The request was blocked by safety filters. Please try a different prompt.", "SAFETY_ERROR");
  }

  if (status === 429 || message.includes("quota")) {
    throw new GeminiError("Rate limit exceeded. Please wait a moment before trying again.", "RATE_LIMIT");
  }

  if (message.includes("network") || message.includes("fetch")) {
    throw new GeminiError("Network error. Please check your internet connection.", "NETWORK_ERROR");
  }

  throw new GeminiError(message, "UNKNOWN_ERROR", error);
}

export async function chatWithGemini(message: string, history: any[] = []) {
  try {
    const ai = getGeminiModel();
    const chat = ai.chats.create({
      model: "gemini-3.1-pro-preview",
      config: {
        systemInstruction: "You are mova ai, an advanced multimodal AI system. You are precise, analytical, and strategic. You break down complex tasks into structured steps. You are professional and confident.",
      },
    });

    const response = await chat.sendMessage({ message });
    if (!response.text) {
      throw new GeminiError("The model returned an empty response, possibly due to safety filters.", "EMPTY_RESPONSE");
    }
    return response.text;
  } catch (error) {
    handleGeminiError(error);
  }
}

export async function editImage(imageB64: string, prompt: string, mimeType: string = "image/png") {
  try {
    const ai = getGeminiModel();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
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
  } catch (error) {
    handleGeminiError(error);
  }
}

export async function analyzeImage(imageB64: string, prompt: string, mimeType: string = "image/png") {
  try {
    const ai = getGeminiModel();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: imageB64,
              mimeType: mimeType,
            },
          },
          {
            text: prompt || "Analyze this image in detail.",
          },
        ],
      },
    });

    if (!response.text) {
      throw new GeminiError("The model returned an empty analysis.", "EMPTY_RESPONSE");
    }
    return response.text;
  } catch (error) {
    handleGeminiError(error);
  }
}
