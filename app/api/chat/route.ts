import { generateCareerReply, isGeminiConfigured } from "@/lib/gemini";
import { supabase } from "@/lib/supabase";

export const runtime = "nodejs";

type ChatPayload = {
    message?: string;
    resume?: string;
    userId?: string;
};

type CareerReply = {
    ats_score: number;
    issues: string[];
    improvements: string[];
    summary: string;
    jobs: string[];
    roadmap: string[];
    missing_skills: string[];
    answer: string;
};

const EMPTY_REPLY: CareerReply = {
    ats_score: 0,
    issues: [],
    improvements: [],
    summary: "",
    jobs: [],
    roadmap: [],
    missing_skills: [],
    answer: "",
};

function calculateDeterministicAtsScore(resume: string) {
    const text = resume.trim();
    const lowerText = text.toLowerCase();

    if (!text) {
        return 0;
    }

    const hasEmail = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text);
    const hasPhone = /(?:\+?\d[\d\s\-()]{7,}\d)/.test(text);
    const hasLinkedIn = /linkedin\.com|linkedin/i.test(lowerText);
    const hasPortfolio = /\bgithub\.com|portfolio|behance|dribbble|gitlab\.com\b/i.test(lowerText);
    const hasLocation = /\b(address|location|city|state|india|usa|remote)\b/i.test(text);
    const length = text.length;

    const sectionPatterns = [
        /\b(summary|profile|objective)\b/i,
        /\bexperience|work history|employment\b/i,
        /\beducation\b/i,
        /\bskills|technical skills|core competencies\b/i,
        /\bprojects\b/i,
        /\bcertifications|certificates\b/i,
    ];

    const bulletCount = (text.match(/[•\-\*]\s|\n\d+\.\s/g) ?? []).length;
    const metricMatches =
        text.match(/\b\d+%|\b\d+\+|\b\d+\s*(users|clients|projects|years|months|days|hours|teams|x)\b/gi) ?? [];
    const dateMatches =
        text.match(/\b(20\d{2}|19\d{2}|jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)\b/gi) ?? [];
    const actionVerbMatches =
        text.match(
            /\b(built|created|developed|delivered|designed|improved|implemented|launched|led|managed|optimized|reduced|increased|scaled|streamlined|automated|analyzed|engineered)\b/gi
        ) ?? [];
    const educationSignalMatches =
        text.match(/\b(bachelor|master|b\.tech|m\.tech|bsc|msc|mba|university|college|cgpa|gpa)\b/gi) ?? [];
    const experienceSignalMatches =
        text.match(/\b(intern|engineer|developer|analyst|manager|designer|consultant|specialist|associate|lead)\b/gi) ?? [];

    const skillMatches = text.match(
        /\b(java|python|javascript|typescript|react|next\.js|node\.js|express|sql|mysql|postgresql|aws|azure|gcp|docker|kubernetes|git|html|css|tailwind|excel|power bi|tableau|figma|c\+\+|spring|mongodb|redis|machine learning|tensorflow|pytorch|api|rest|graphql)\b/gi
    ) ?? [];
    const uniqueSkills = new Set(skillMatches.map((skill) => skill.toLowerCase())).size;

    let score = 0;

    const contactScore =
        (hasEmail ? 7 : 0) +
        (hasPhone ? 7 : 0) +
        (hasLinkedIn ? 4 : 0) +
        (hasPortfolio ? 4 : 0) +
        (hasLocation ? 3 : 0);

    const structureScore =
        (sectionPatterns[0]?.test(text) ? 4 : 0) +
        (sectionPatterns[1]?.test(text) ? 8 : 0) +
        (sectionPatterns[2]?.test(text) ? 5 : 0) +
        (sectionPatterns[3]?.test(text) ? 8 : 0) +
        (sectionPatterns[4]?.test(text) ? 3 : 0) +
        (sectionPatterns[5]?.test(text) ? 2 : 0);

    let contentScore = 0;
    if (length >= 500) contentScore += 4;
    if (length >= 900) contentScore += 5;
    if (length >= 1400) contentScore += 4;
    if (length > 5000) contentScore -= 4;
    if (bulletCount >= 4) contentScore += 4;
    if (bulletCount >= 8) contentScore += 4;
    if (dateMatches.length >= 4) contentScore += 4;
    if (educationSignalMatches.length > 0) contentScore += 4;
    if (experienceSignalMatches.length > 0) contentScore += 5;

    let impactScore = 0;
    impactScore += Math.min(10, metricMatches.length * 2);
    impactScore += Math.min(8, actionVerbMatches.length);
    if (/\bresponsible for\b/i.test(text)) impactScore -= 4;
    if (!metricMatches.length) impactScore -= 6;

    let skillScore = 0;
    skillScore += Math.min(14, uniqueSkills * 2);
    if (/\b(skill|tools|technology|stack)\b/i.test(text)) skillScore += 4;
    if (/\bsoft skills\b/i.test(text)) skillScore -= 1;

    score =
        Math.max(0, Math.min(25, contactScore)) +
        Math.max(0, Math.min(30, structureScore)) +
        Math.max(0, Math.min(20, contentScore)) +
        Math.max(0, Math.min(15, impactScore)) +
        Math.max(0, Math.min(10, skillScore));

    if (!sectionPatterns[1]?.test(text)) score -= 10;
    if (!sectionPatterns[3]?.test(text)) score -= 8;
    if (!hasEmail || !hasPhone) score -= 6;

    return Math.max(38, Math.min(96, Math.round(score)));
}

function hasUsableResume(resume: string) {
    const normalizedResume = resume.trim();

    if (!normalizedResume) {
        return false;
    }

    return !normalizedResume.includes("Parsing disabled temporarily");
}

function buildSystemPrompt(resume: string, message: string) {
    return `
You are an AI career assistant that chats about a candidate's uploaded resume.

Your job:
- Use the resume as the primary source of truth.
- Answer the user's latest question while staying grounded in the resume.
- Support resume conversations such as ATS score, missing or required skills, job recommendations, resume gaps, and a learning plan with a timeline.
- If the user's request is broad, give a complete resume review.
- If the user's request is narrow, focus on that topic but still keep the output helpful.
- Never say you cannot discuss the resume when resume text is available.

Return ONLY valid JSON with this exact structure:
{
  "ats_score": number,
  "issues": [string],
  "improvements": [string],
  "summary": string,
  "jobs": [string],
  "roadmap": [string],
  "missing_skills": [string],
  "answer": string
}

Rules:
- "ats_score" must be an integer from 0 to 100 based on ATS readiness of the current resume.
- "issues" should list resume problems, weak signals, gaps, formatting problems, vague bullets, or missing evidence.
- "improvements" should give direct fixes to improve the resume.
- "summary" should be a short personalized assessment tied to the user's question.
- "jobs" should contain 3 to 6 realistic target roles that fit the profile.
- "roadmap" should be a timeline-based plan. Each item must start with a timeframe such as "Weeks 1-2:", "Month 1:", or "Months 2-3:".
- "missing_skills" should include missing or underrepresented skills required for the target roles or implied by the user's question.
- "answer" should directly answer the user's latest question in a concise, conversational way.
- Keep every item plain text with no markdown.
- Do not wrap the JSON in code fences.
- Do not invent resume experience that is not supported by the resume. You may infer likely role fit, but keep it realistic.

User question:
${message}

Resume:
${resume}
`;
}

function normalizeStringArray(value: unknown) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean);
}

function normalizeCareerReply(value: unknown): CareerReply {
    if (!value || typeof value !== "object") {
        return {
            ...EMPTY_REPLY,
            answer: "I could not parse the AI response. Please try asking again.",
        };
    }

    const data = value as Partial<CareerReply>;
    const score =
        typeof data.ats_score === "number" && Number.isFinite(data.ats_score)
            ? Math.max(0, Math.min(100, Math.round(data.ats_score)))
            : 0;

    return {
        ats_score: score,
        issues: normalizeStringArray(data.issues),
        improvements: normalizeStringArray(data.improvements),
        summary: typeof data.summary === "string" ? data.summary.trim() : "",
        jobs: normalizeStringArray(data.jobs),
        roadmap: normalizeStringArray(data.roadmap),
        missing_skills: normalizeStringArray(data.missing_skills),
        answer: typeof data.answer === "string" ? data.answer.trim() : "",
    };
}

export async function POST(req: Request) {
    try {
        const { message, resume, userId } = (await req.json()) as ChatPayload;

        if (!isGeminiConfigured()) {
            return Response.json({ error: "Gemini not configured" }, { status: 500 });
        }

        const userMessage = message?.trim();
        const resumeText = resume?.trim() ?? "";

        if (!userMessage) {
            return Response.json({ error: "Message is required" }, { status: 400 });
        }

        if (!hasUsableResume(resumeText)) {
            return Response.json(
                {
                    error:
                        "A parsed resume is required before starting the conversation. Upload parsing is still returning placeholder text.",
                },
                { status: 400 }
            );
        }

        const reply = await generateCareerReply({
            systemPrompt: buildSystemPrompt(resumeText, userMessage),
            message: userMessage,
        });

        let parsedReply: CareerReply;

        try {
            parsedReply = normalizeCareerReply(JSON.parse(reply));
        } catch {
            parsedReply = {
                ...EMPTY_REPLY,
                answer: reply,
                summary: "Resume conversation response",
            };
        }

        if (!parsedReply.summary && parsedReply.answer) {
            parsedReply.summary = parsedReply.answer;
        }

        parsedReply.ats_score = calculateDeterministicAtsScore(resumeText);

        if (supabase) {
            await supabase.from("results").insert({
                user_id: userId,
                resume: resumeText,
                response: parsedReply,
            });
        }

        return Response.json({ data: parsedReply });
    } catch (error) {
        console.error("Error in chat API:", error);
        return Response.json({ error: "Failed to process request" }, { status: 500 });
    }
}
