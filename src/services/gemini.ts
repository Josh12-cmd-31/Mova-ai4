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
    throw new GeminiError("Rate limit exceeded. The system is currently busy. Please wait about 30-60 seconds before trying again.", "RATE_LIMIT");
  }

  if (message.includes("network") || message.includes("fetch")) {
    throw new GeminiError("Network error. Please check your internet connection.", "NETWORK_ERROR");
  }

  throw new GeminiError(message, "UNKNOWN_ERROR", error);
}

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function chatWithGemini(message: string, history: any[] = []) {
  const models = ["gemini-3.1-pro-preview", "gemini-3-flash-preview", "gemini-flash-lite-latest"];
  let lastError: any = null;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      const ai = getGeminiModel();
      const chat = ai.chats.create({
        model: model,
        config: {
          systemInstruction: "You are mova ai, an advanced multimodal AI system. You are precise, analytical, and strategic. You break down complex tasks into structured steps. You are professional and confident.",
        },
      });

      const response = await chat.sendMessage({ message });
      if (!response.text) {
        throw new GeminiError("The model returned an empty response.", "EMPTY_RESPONSE");
      }
      return response.text;
    } catch (error: any) {
      lastError = error;
      const errMsg = error.message || "";
      const isRateLimit = errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("Rate limit");
      
      if (!isRateLimit || i === models.length - 1) {
        handleGeminiError(error);
      }
      
      console.warn(`Model ${model} failed with rate limit, trying fallback in 1s...`);
      await delay(1000);
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
    const isRateLimit = error.status === 429 || (error.message && (error.message.includes("429") || error.message.includes("quota") || error.message.includes("Rate limit")));
    if (isRateLimit && retries > 0) {
      const delayTime = (6 - retries) * 2000;
      console.warn(`Rate limited, retrying in ${delayTime}ms... (${retries} retries left)`);
      await delay(delayTime);
      return generateImageWithRetry(ai, modelName, prompt, retries - 1);
    }
    throw error;
  }
}

export async function generateImage(prompt: string) {
  try {
    const ai = getGeminiModel();
    const response = await generateImageWithRetry(ai, "gemini-2.5-flash-image", prompt);

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

export async function editImage(imageB64: string, prompt: string, mimeType: string = "image/png") {
  let attempts = 0;
  const maxAttempts = 2;
  
  while (attempts < maxAttempts) {
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
    } catch (error: any) {
      attempts++;
      const errMsg = error.message || "";
      const isRateLimit = errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("Rate limit");
      
      if (isRateLimit && attempts < maxAttempts) {
        console.warn("Image edit rate limited, retrying in 2s...");
        await delay(2000);
        continue;
      }
      handleGeminiError(error);
    }
  }
}

export async function analyzeImage(imageB64: string, prompt: string, mimeType: string = "image/png") {
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
    } catch (error: any) {
      lastError = error;
      const errMsg = error.message || "";
      const isRateLimit = errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("Rate limit");
      
      if (!isRateLimit || i === models.length - 1) {
        handleGeminiError(error);
      }
      
      console.warn(`Image analysis ${model} rate limited, trying fallback in 1s...`);
      await delay(1000);
    }
  }
  handleGeminiError(lastError);
}
