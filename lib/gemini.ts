const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function getGeminiApiKey() {
    const key = process.env.GEMINI_API_KEY;

    if (!key || key === "your_gemini_api_key") {
        return null;
    }

    return key;
}

export function isGeminiConfigured() {
    return Boolean(getGeminiApiKey());
}

export async function generateCareerReply({
    systemPrompt,
    message,
}: {
    systemPrompt: string;
    message: string;
}) {
    const apiKey = getGeminiApiKey();

    if (!apiKey) {
        throw new Error("Gemini not configured");
    }

    const response = await fetch(
        `${GEMINI_API_URL}/${DEFAULT_MODEL}:generateContent`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [{ text: systemPrompt }],
                },
                contents: [
                    {
                        role: "user",
                        parts: [{ text: message }],
                    },
                ],
            }),
        }
    );

    const data = await response.json();

    if (!response.ok) {
        const apiError =
            data?.error?.message || `Gemini request failed with status ${response.status}`;
        throw new Error(apiError);
    }

    const reply = data?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text || "")
        .join("")
        .trim();

    if (!reply) {
        throw new Error("Gemini returned an empty response");
    }

    return reply;
}
