import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import OpenAI from "openai";
import i18n from '../i18n';

const apiKey = process.env.GEMINI_API_KEY;
const openAiKey = process.env.OPENAI_API_KEY;

export const getGeminiModel = () => {
  const key = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(i18n.t('gemini_api_key_not_set'));
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
  console.error(i18n.t('gemini_api_error_console'), error);
  
  let message = error.message || i18n.t('unexpected_error_occurred');
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
  
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("api_key_invalid") || lowerMessage.includes("api key not valid") || lowerMessage.includes("invalid api key")) {
    throw new GeminiError(i18n.t('api_key_invalid'), "AUTH_ERROR");
  }
  
  if (lowerMessage.includes("safety") || lowerMessage.includes("blocked") || lowerMessage.includes("candidate was blocked")) {
    if (lowerMessage.includes("image")) {
      throw new GeminiError(i18n.t('safety_block_gen'), "SAFETY_ERROR");
    }
    throw new GeminiError(i18n.t('safety_blocked'), "SAFETY_ERROR");
  }

  if (status === 400 || String(status) === "400" || lowerMessage.includes("invalid_argument") || lowerMessage.includes("bad request")) {
    throw new GeminiError(i18n.t('invalid_request_error'), "INVALID_REQUEST");
  }

  if (status === 403 || String(status) === "403" || lowerMessage.includes("permission_denied")) {
    throw new GeminiError(i18n.t('permission_denied_error'), "PERMISSION_DENIED");
  }

  if (status === 404 || String(status) === "404" || lowerMessage.includes("not_found") || lowerMessage.includes("resource not found")) {
    throw new GeminiError(i18n.t('resource_not_found_error'), "NOT_FOUND");
  }

  if (status === 429 || String(status) === "429" || lowerMessage.includes("quota") || lowerMessage.includes("rate limit") || lowerMessage.includes("too many requests")) {
    throw new GeminiError(i18n.t('rate_limit_error'), "RATE_LIMIT");
  }

  if (status === 500 || String(status) === "500" || lowerMessage.includes("internal") || lowerMessage.includes("server error")) {
    throw new GeminiError(i18n.t('internal_server_error'), "INTERNAL_ERROR");
  }

  if (status === 503 || String(status) === "503" || lowerMessage.includes("high demand") || lowerMessage.includes("unavailable") || lowerMessage.includes("service unavailable") || lowerMessage.includes("overloaded")) {
    throw new GeminiError(i18n.t('service_unavailable_error'), "SERVICE_UNAVAILABLE");
  }

  if (lowerMessage.includes("network") || lowerMessage.includes("fetch") || lowerMessage.includes("failed to fetch") || lowerMessage.includes("connection")) {
    throw new GeminiError(i18n.t('network_error'), "NETWORK_ERROR");
  }

  if (lowerMessage.includes("empty response") || lowerMessage.includes("no content")) {
    throw new GeminiError(i18n.t('empty_response_error'), "EMPTY_RESPONSE");
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
          systemInstruction: `You are Mova AI Studio, an advanced multimodal AI system specializing in creative and technical writing. You are precise, analytical, and strategic. 

CAPABILITIES:
- Creative Writing: You excel at generating high-quality song lyrics, movie/play scripts, short stories, and poetry based on any given theme, mood, or genre.
- Technical Writing: You provide detailed technical documentation, API guides, whitepapers, and structured reports.
- Tone Adaptation: You can adapt your tone to be formal, academic, persuasive, inspirational, or conversational as requested by the user.
- Structure: You maintain high narrative coherence and professional structure across all formats.

COHERENCE PROTOCOL:
- Logical Flow: Ensure every paragraph or section transitions smoothly to the next.
- Consistency: Maintain consistent character voices, technical terminology, and narrative perspective.
- Structural Integrity: Adhere strictly to the requested format's standard conventions (e.g., script formatting, song structure).
- Thematic Unity: Ensure all parts of the response contribute to the central objective or theme.

RULES:
- When asked to create content (like songs, scripts, or documentation), provide only the title and the content itself without any conversational filler or explanations.
- For songs, generate lyrics that strictly adhere to the requested theme, mood, or genre. Clearly separate and label sections like [Verse 1], [Chorus], [Verse 2], [Bridge], [Outro], etc.
- For scripts, follow standard industry formatting (Scene Headings, Action Lines, Character Names, and Dialogue).
- For technical documentation, use clear headings, structured lists, and logical sections.
- Do not use Markdown symbols like '#' or '*' in your output. Use plain text formatting with clear spacing and capitalization for structure.
- Maintain a professional and confident tone by default unless a specific tone is requested.`,
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
      
      console.warn(i18n.t('model_failed_trying_next_console', { model }));
      await delay(1000);
    }
  }

  // If all Gemini models fail, try OpenAI as fallback
  const openai = getOpenAIClient();
  if (openai) {
    console.info(i18n.t('openai_fallback_info_console'));
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: `You are Mova AI Studio, an advanced multimodal AI system specializing in creative and technical writing. You are precise, analytical, and strategic. 

CAPABILITIES:
- Creative Writing: High-quality song lyrics, movie/play scripts, short stories, and poetry based on any given theme, mood, or genre.
- Technical Writing: Detailed technical documentation, API guides, whitepapers, and structured reports.
- Tone Adaptation: Adapt tone to be formal, academic, persuasive, inspirational, or conversational as requested.
- Structure: Maintain high narrative coherence and professional structure across all formats.

COHERENCE PROTOCOL:
- Logical Flow: Ensure every paragraph or section transitions smoothly to the next.
- Consistency: Maintain consistent character voices, technical terminology, and narrative perspective.
- Structural Integrity: Adhere strictly to the requested format's standard conventions (e.g., script formatting, song structure).
- Thematic Unity: Ensure all parts of the response contribute to the central objective or theme.

RULES:
- When asked to create content, provide only the title and the content itself without any conversational filler or explanations.
- For songs, strictly adhere to the requested theme, mood, or genre. Clearly separate and label sections ([Verse 1], [Chorus], [Verse 2], [Bridge], [Outro], etc.).
- For scripts, follow standard industry formatting (Scene Headings, Action Lines, Character Names, and Dialogue).
- For technical documentation, use clear headings, structured lists, and logical sections.
- Do not use Markdown symbols like '#' or '*' in your output. Use plain text formatting.
- Maintain a professional and confident tone by default unless a specific tone is requested.` },
          ...history.map(h => ({ 
            role: (h.role === 'user' ? 'user' : 'assistant') as "user" | "assistant", 
            content: h.content 
          })),
          { role: "user", content: message }
        ],
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error(i18n.t('openai_empty_response'));
      }
      return responseText;
    } catch (oaError: any) {
      console.error(i18n.t('openai_fallback_failed_console'), oaError);
      // If OpenAI also fails, throw the original Gemini error or a combined one
      handleGeminiError(lastError || oaError);
    }
  }

  handleGeminiError(lastError);
}

export interface ImageOptions {
  aspectRatio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9" | "1:4" | "1:8" | "4:1" | "8:1";
  negativePrompt?: string;
  seed?: number;
  style?: string;
  useSearch?: boolean;
}

async function generateImageWithRetry(ai: any, modelName: string, prompt: string, options: ImageOptions = {}, retries = 5): Promise<GenerateContentResponse> {
  try {
    const config: any = {
      imageConfig: {
        aspectRatio: options.aspectRatio,
        seed: options.seed,
      }
    };

    if (options.useSearch && (modelName === 'gemini-3-pro-image-preview' || modelName === 'gemini-3.1-flash-image-preview')) {
      config.tools = [
        {
          googleSearch: {
            searchTypes: {
              webSearch: {},
              imageSearch: modelName === 'gemini-3.1-flash-image-preview' ? {} : undefined,
            }
          },
        },
      ];
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: {
        parts: [{ text: prompt }],
      },
      config
    });
    return response;
  } catch (error: any) {
    if (isTransientError(error) && retries > 0) {
      const delayTime = (6 - retries) * 2000;
      console.warn(i18n.t('transient_error_retrying_console', { delay: delayTime, retries }));
      await delay(delayTime);
      return generateImageWithRetry(ai, modelName, prompt, options, retries - 1);
    }
    throw error;
  }
}

export async function generateImage(prompt: string, model: string = "gemini-2.5-flash-image", options: ImageOptions = {}) {
  try {
    const ai = getGeminiModel();
    
    // Construct enhanced prompt with style and negative prompt if provided
    let enhancedPrompt = prompt;
    if (options.style) {
      enhancedPrompt = `In the style of ${options.style}: ${enhancedPrompt}`;
    }
    if (options.negativePrompt) {
      enhancedPrompt = `${enhancedPrompt}. Negative prompt (exclude these elements): ${options.negativePrompt}`;
    }

    // Handle Imagen models differently
    if (model.startsWith("imagen-")) {
      const response = await ai.models.generateImages({
        model: model,
        prompt: enhancedPrompt,
        config: {
          numberOfImages: 1,
          aspectRatio: options.aspectRatio || "1:1",
        },
      });
      
      const generatedImageB64 = response.generatedImages[0].image.imageBytes;
      return { generatedImageB64, textResponse: "Image generated using Imagen." };
    }

    // Handle Nano Banana series
    const response = await generateImageWithRetry(ai, model, enhancedPrompt, options);

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
        console.warn(i18n.t('image_edit_transient_error_retrying_console', { delay: delayTime }));
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
      
      console.warn(i18n.t('file_analysis_transient_error_trying_fallback_console', { model }));
      await delay(1500);
    }
  }
  handleGeminiError(lastError);
}
