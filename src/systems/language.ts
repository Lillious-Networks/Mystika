import log from "../modules/logger";
const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

const language = {
    translate: async (text: string, lang: string) => {
        if (!text || text.trim() === "") return text;
        if (!API_KEY) {
            log.warn("Google Translate API Key not found");
            return text;
        }
        let response = await language.post({ text, lang }) as any;
        if (!response) return text;
        // Replace any HTML entities
        const htmlEntities: { [key: string]: string } = {
            "&amp;": "&",
            "&lt;": "<",
            "&gt;": ">",
            "&quot;": "\"",
            "&#39;": "'",
            "&#96;": "`"
        };

        response = response.replace(/&(?:amp|lt|gt|quot|#39|#96);/g, (match: string) => htmlEntities[match]);
        
        log.debug(`Translated text: ${response}`);
        return response;
    },
    post: async (data: any) => {
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