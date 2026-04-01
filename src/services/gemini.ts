import { GoogleGenAI, Type } from "@google/genai";
import { CaptionRequest, GeneratedCaptions, Language } from "../types";
import { jsonrepair } from "jsonrepair";

const MODEL_NAME = "gemini-3-flash-preview";

export async function generateCaptions(
  request: CaptionRequest, 
  onUpdate?: (partial: Partial<GeneratedCaptions>) => void,
  generateAllLanguages: boolean = false
): Promise<GeneratedCaptions> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  const languagesStr = request.languages.length > 0 ? request.languages.join(", ") : "English";
  const targetLanguages = generateAllLanguages ? "ALL available languages (English, French, Spanish, Portuguese, Swahili, Arabic, Hindi, German, Amharic, Afaan Oromo)" : languagesStr;
  
  const prompt = `
    You are an AI Caption Generator backend.
    You MUST follow user input strictly.

    🎯 RULES (VERY STRICT)
    - Generate captions ONLY in selected language(s): ${targetLanguages}
    - Generate EXACTLY ${request.count} social media captions for ${request.platform}.
    - Each caption should be approximately ${request.linesPerCaption} lines long.
    - If multiple languages are selected, generate the SAME set of ${request.count} captions translated into each language.
    - Always write captions in FIRST PERSON ("I", "my"). Assume the user is the subject.
    - Tone: ${request.tone}
    - Emoji Intensity: ${request.emojiIntensity === 0 ? 'None' : request.emojiIntensity === 1 ? 'Low' : request.emojiIntensity === 2 ? 'Medium' : 'Abundant'}
    - ${request.emojiIntensity > 0 ? "CRITICAL: You MUST include emojis in EVERY caption based on the requested intensity." : "CRITICAL: Do NOT include any emojis in the captions."}
    - Understand the user's feeling and mood from the input and reflect it in the captions. Be empathetic, caring, and supportive.
    - Choose the BEST, most engaging, and emotionally resonant captions for the selected platform.
    - Keep captions clear and social-media ready.
    - Do NOT ignore user settings.

    📥 INPUT
    - Media Analysis/Description: "${request.description || 'None'}"
    - Languages: ${targetLanguages}
    - Tone: ${request.tone}
    - Count: ${request.count}
    - Lines per caption: ${request.linesPerCaption}

    📤 OUTPUT FORMAT
    Return ONLY this JSON structure:
    {
      "image_understanding": {
        "description": "Short summary of what you see",
        "mood": "One word mood"
      },
      "captions": {
        "[Language Name]": [
          { "text": "Caption 1" },
          { "text": "Caption 2" }
        ]
      },
      "hashtags": ["tag1", "tag2"]
    }

    ⚠️ STRICT RULES
    - If user selects ${request.count} captions -> return EXACTLY ${request.count} per language.
    - If user selects specific languages -> return ONLY those languages.
    - Do NOT explain anything. Do NOT add extra text.
  `;

  const contents: any[] = [];
  
  if (request.image) {
    let mimeType = request.mimeType || "image/jpeg";
    
    if (mimeType.startsWith('video/')) {
      if (!['video/mp4', 'video/mpeg', 'video/mov', 'video/webm', 'video/mpg', 'video/avi', 'video/wmv', 'video/mpegps', 'video/flv', 'video/3gpp'].includes(mimeType)) {
        mimeType = 'video/mp4';
      }
    }
    
    contents.push({
      inlineData: {
        mimeType: mimeType,
        data: request.image.split(",")[1]
      }
    });
  }
  
  contents.push({ text: prompt });

  try {
    const responseStream = await ai.models.generateContentStream({
      model: MODEL_NAME,
      contents: { parts: contents },
      config: {
        responseMimeType: "application/json"
      }
    });

    let fullText = "";
    let lastParsed: Partial<GeneratedCaptions> = {};

    for await (const chunk of responseStream) {
      if (chunk.text) {
        fullText += chunk.text;
        try {
          const cleanText = fullText.replace(/```json/g, "").replace(/```/g, "").trim();
          const repaired = jsonrepair(cleanText);
          const parsed = JSON.parse(repaired) as Partial<GeneratedCaptions>;
          lastParsed = parsed;
          if (onUpdate) {
            onUpdate(parsed);
          }
        } catch (e) {
          // Ignore parse errors during streaming
        }
      }
    }

    if (!fullText.trim()) {
      throw new Error("The AI returned an empty response. This can happen if the content was flagged or if there was a temporary glitch.");
    }

    console.log("AI Response:", fullText);
    const cleanText = fullText.replace(/```json/g, "").replace(/```/g, "").trim();
    const repaired = jsonrepair(cleanText);
    const result = JSON.parse(repaired) as any;
    
    // Normalize captions if they are an array instead of an object
    if (result.captions && Array.isArray(result.captions)) {
      const lang = result.language || "English";
      result.captions = { [lang]: result.captions };
    }
    
    if (result.error) {
      throw new Error(result.error);
    }

    // Final validation: ensure we have captions
    if (!result.captions || Object.keys(result.captions).length === 0) {
      if (lastParsed.captions && Object.keys(lastParsed.captions).length > 0) {
        return lastParsed as GeneratedCaptions;
      }
      throw new Error("The AI failed to generate captions. Please try adjusting your description or settings.");
    }

    return result;
  } catch (e: any) {
    console.error("Gemini generation error:", e);
    if (e.message?.includes("safety")) {
      throw new Error("The request was declined due to safety filters. Please try a different image or description.");
    }
    throw e;
  }
}

export async function detectLanguage(text: string): Promise<Language | null> {
  if (!text || text.trim().length < 3) return null;
  
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `
    Analyze the following text and detect its language. 
    Return ONLY the language name from this list: English, French, Spanish, Portuguese, Swahili, Arabic, Hindi, German, Amharic, Afaan Oromo, Portuguese (Brazil).
    If the language is not in the list, return "null".
    
    Text: "${text}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    const detected = response.text?.trim();
    if (detected && detected !== "null" && LANGUAGES.includes(detected as Language)) {
      return detected as Language;
    }
    return null;
  } catch (e) {
    console.error("Language detection failed", e);
    return null;
  }
}

const LANGUAGES: Language[] = ['English', 'French', 'Spanish', 'Portuguese', 'Swahili', 'Arabic', 'Hindi', 'German', 'Amharic', 'Afaan Oromo', 'Portuguese (Brazil)'];
