import log from "../modules/logger";
const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

const language = {
    translate: async (text: string, lang: string) => {
        if (!text || text.trim() === "") return text;
        if (!API_KEY) {
            log.warn("Google Translate API Key not found");
            return text;
        }
        log.info(`Translating text: ${text} to ${lang}`);
        const response = await language.post({ text, lang }) as any;
        if (!response) return;
        return response;
    },
    detect: async (text: string) => {
        const url = new URL("https://translation.googleapis.com/language/translate/v2/detect");
        // API Key
        url.searchParams.append('key', API_KEY as string);
        // Text to detect
        url.searchParams.append('q', text);
        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        }).then((res) => res.json());

        // Get any errors
        if (response.error) {
            log.error(`Error detecting language: ${response.error.message}`);
            return;
        }

        return response.data.detections[0][0].language;
    },
    post: async (data: any) => {
        // Source language
        const detectedLanguage = await language.detect(data.text);
        if (detectedLanguage === data.lang) return data.text;
        const url = new URL("https://translation.googleapis.com/language/translate/v2");
        // API Key
        url.searchParams.append('key', API_KEY as string);
        // Text to translate
        url.searchParams.append('q', data.text);
        
        // Target language
        url.searchParams.append('target', data.lang);
        const response = await fetch(url, {
            method: "POST",
            body: JSON.stringify(data),
            headers: {
                "Content-Type": "application/json",
            },
        }).then((res) => res.json());
        
        // Get any errors
        if (response.error) {
            log.error(`Error translating text: ${response.error.message}`);
            return;
        }

        return response.data.translations[0].translatedText;
    }
};

export default language;