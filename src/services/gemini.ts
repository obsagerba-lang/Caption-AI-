import { GoogleGenAI, Type } from "@google/genai";
import { CaptionRequest, GeneratedCaptions, Language } from "../types";
import { jsonrepair } from "jsonrepair";

const MODEL_NAME = "gemini-3-flash-preview";
const LANGUAGES: Language[] = ['English', 'French', 'Spanish', 'Portuguese', 'Swahili', 'Arabic', 'Hindi', 'German', 'Amharic', 'Afaan Oromo', 'Portuguese (Brazil)'];

/**
 * Generates social media captions using Magic AI.
 * Optimizes performance for multiple languages by parallelizing requests.
 */
export async function generateCaptions(
  request: CaptionRequest, 
  onUpdate?: (partial: Partial<GeneratedCaptions>) => void,
  generateAllLanguages: boolean = false
): Promise<GeneratedCaptions> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
  // Determine which languages to generate
  const allLangs = generateAllLanguages 
    ? LANGUAGES 
    : (request.languages.length > 0 ? request.languages : ['English'] as Language[]);
  
  // State for merging results from parallel requests
  let mergedResult: GeneratedCaptions = { 
    captions: {},
    hashtags: [],
    image_understanding: { description: "", mood: "" }
  } as GeneratedCaptions;

  const updateMerged = (partial: Partial<GeneratedCaptions>) => {
    // Deep merge captions to avoid overwriting other languages
    const newCaptions = { ...mergedResult.captions };
    if (partial.captions) {
      Object.entries(partial.captions).forEach(([lang, caps]) => {
        newCaptions[lang as Language] = caps as any;
      });
    }

    mergedResult = {
      ...mergedResult,
      ...partial,
      captions: newCaptions,
      image_understanding: {
        ...mergedResult.image_understanding,
        ...(partial.image_understanding || {})
      },
      hashtags: partial.hashtags && partial.hashtags.length > 0 ? partial.hashtags : mergedResult.hashtags
    };
    
    if (onUpdate) {
      onUpdate(mergedResult);
    }
  };

  try {
    // If only one language, do it in one go (standard path)
    if (allLangs.length <= 1) {
      return await executeGeneration(ai, request, allLangs, updateMerged);
    }

    // For multiple languages, parallelize to significantly improve speed
    // Phase 1: Generate primary language + metadata (Image Analysis)
    // This provides the "source" captions that will be translated
    const primaryLang = allLangs[0];
    const primaryResult = await executeGeneration(ai, request, [primaryLang], updateMerged);
    
    // Phase 2: Generate other languages in parallel chunks
    // We chunk them to avoid hitting rate limits while still being fast
    const otherLangs = allLangs.slice(1);
    const chunks = [];
    const chunkSize = 3; // 3 languages per parallel request is a good balance
    for (let i = 0; i < otherLangs.length; i += chunkSize) {
      chunks.push(otherLangs.slice(i, i + chunkSize));
    }

    // Run chunks in parallel
    const chunkPromises = chunks.map(chunk => 
      executeGeneration(ai, { ...request, languages: chunk }, chunk, updateMerged, primaryResult)
    );

    // Wait for all translations to complete
    await Promise.all(chunkPromises);
    
    return mergedResult;
  } catch (e: any) {
    console.error("AI generation error:", e);
    if (e.message?.includes("safety")) {
      throw new Error("The request was declined due to safety filters. Please try a different image or description.");
    }
    throw e;
  }
}

/**
 * Internal helper to execute a single generation/translation request
 */
async function executeGeneration(
  ai: any,
  request: CaptionRequest,
  languages: Language[],
  onUpdate: (partial: Partial<GeneratedCaptions>) => void,
  referenceResult?: GeneratedCaptions
): Promise<GeneratedCaptions> {
  const languagesStr = languages.join(", ");
  
  let prompt = "";
  if (referenceResult) {
    // TRANSLATION MODE: Fast path
    // We provide the already generated captions to ensure consistency and speed up the process
    const refCaptions = Object.values(referenceResult.captions || {})[0] || [];
    const refTexts = refCaptions.map((c: any) => typeof c === 'string' ? c : c.text).join("\n---\n");
    
    prompt = `
      You are a translation assistant for a social media caption app.
      
      TASK:
      Translate the following ${refCaptions.length} captions into these languages: ${languagesStr}.
      Maintain the EXACT same tone (${request.tone}) and emoji style.
      Assume the user is the subject (first person).
      
      CAPTIONS TO TRANSLATE:
      ${refTexts}
      
      OUTPUT FORMAT:
      Return ONLY this JSON structure:
      {
        "captions": {
          "${languages[0]}": [
            { "text": "Translated Caption 1" }
          ]
        }
      }
      (Include all requested languages in the "captions" object)
    `;
  } else {
    // INITIAL GENERATION MODE: Full analysis
    prompt = `
      You are an AI Caption Generator backend.
      🎯 RULES
      - Generate captions ONLY in: ${languagesStr}
      - Generate EXACTLY ${request.count} captions for ${request.platform}.
      - Tone: ${request.tone}
      - Emoji Intensity: ${request.emojiIntensity === 0 ? 'None' : request.emojiIntensity === 1 ? 'Low' : request.emojiIntensity === 2 ? 'Medium' : 'Abundant'}
      - Hashtag Count: ${request.hashtagCount}
      - Hashtag Type: ${request.hashtagType}
      - Hashtag Length: ${request.hashtagLength}
      - Each caption should be ~${request.linesPerCaption} lines.
      - Write in FIRST PERSON ("I", "my").
      
      ✨ PERSONALIZATION & EMOTION:
      - Do NOT just describe the photo. Share the FEELING and VIBE.
      - If the photo shows laughter, make the caption burst with joy, humor, and the specific reason for the laugh.
      - If the photo is sad or reflective, use deep, emotional, and poetic language that shares the weight of the moment.
      - Connect with the audience by sharing the "why" behind the moment.
      - Make it sound like a real person sharing a real memory, not an AI list.
      - Use sensory language (what it felt like, the atmosphere, the unspoken words).
      - Avoid generic "order style" or "fact-based" captions.
      
      OUTPUT FORMAT:
      Return ONLY this JSON structure:
      {
        "captions": {
          "${languages[0]}": [
            { "text": "Caption 1" }
          ]
        },
        "image_understanding": {
          "description": "Summary of media",
          "mood": "Detailed emotional mood (e.g., 'Radiant Joy', 'Quiet Melancholy', 'Fierce Confidence')"
        },
        "hashtags": ["tag1", "tag2"]
      }
    `;
  }

  const contents: any[] = [];
  // Only send image data if we are in INITIAL GENERATION MODE (no referenceResult)
  if (request.image && !referenceResult) {
    let mimeType = request.mimeType || "image/jpeg";
    // Basic video mimeType normalization
    if (mimeType.startsWith('video/')) {
      const validVideoTypes = ['video/mp4', 'video/mpeg', 'video/mov', 'video/webm', 'video/mpg', 'video/avi', 'video/wmv', 'video/mpegps', 'video/flv', 'video/3gpp'];
      if (!validVideoTypes.includes(mimeType)) mimeType = 'video/mp4';
    }
    
    contents.push({
      inlineData: {
        mimeType: mimeType,
        data: request.image.split(",")[1]
      }
    });
  }
  contents.push({ text: prompt });

  const responseStream = await ai.models.generateContentStream({
    model: MODEL_NAME,
    contents: { parts: contents },
    config: { responseMimeType: "application/json" }
  });

  let fullText = "";
  for await (const chunk of responseStream) {
    if (chunk.text) {
      fullText += chunk.text;
      try {
        const cleanText = fullText.replace(/```json/g, "").replace(/```/g, "").trim();
        const repaired = jsonrepair(cleanText);
        const parsed = JSON.parse(repaired) as Partial<GeneratedCaptions>;
        onUpdate(parsed);
      } catch (e) { /* Ignore partial parse errors */ }
    }
  }

  const finalClean = fullText.replace(/```json/g, "").replace(/```/g, "").trim();
  if (!finalClean) throw new Error("Empty AI response");
  
  const finalRepaired = jsonrepair(finalClean);
  const result = JSON.parse(finalRepaired) as GeneratedCaptions;
  
  // Normalize if AI returned array instead of object
  if (result.captions && Array.isArray(result.captions)) {
    const lang = languages[0];
    result.captions = { [lang]: result.captions } as any;
  }
  
  return result;
}

/**
 * Detects the language of a given text.
 */
export async function detectLanguage(text: string): Promise<Language | null> {
  if (!text || text.trim().length < 3) return null;
  
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = `
    Analyze the following text and detect its language. 
    Return ONLY the language name from this list: ${LANGUAGES.join(", ")}.
    If the language is not in the list, return "null".
    
    Text: "${text}"
  `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
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
