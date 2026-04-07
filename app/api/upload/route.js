import path from "node:path";
import { pathToFileURL } from "node:url";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";

export const runtime = "nodejs";

import pdfParse from "pdf-parse";

function normalizeResumeText(text) {
    return text
        .replace(/\r/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

export async function POST(req) {
    try {
        const formData = await req.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return Response.json({ error: "No PDF file uploaded" }, { status: 400 });
        }

        if (file.type !== "application/pdf") {
            return Response.json({ error: "Only PDF files are supported" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());

        const data = await pdfParse(buffer);

        const text = normalizeResumeText(data.text);

        if (!text) {
            return Response.json(
                { error: "Could not extract text from this PDF" },
                { status: 400 }
            );
        }

        return Response.json({ text });

    } catch (err) {
        console.error("UPLOAD ERROR:", err);

        return Response.json(
            { error: err instanceof Error ? err.message : "Upload failed" },
            { status: 500 }
        );
    }
}
