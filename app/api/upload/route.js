import path from "node:path";
import { pathToFileURL } from "node:url";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";

export const runtime = "nodejs";

GlobalWorkerOptions.workerSrc = pathToFileURL(
    path.join(process.cwd(), "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs")
).href;

function normalizeResumeText(text) {
    return text
        .replace(/\r/g, "\n")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

async function extractTextFromPdf(file) {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);

    const loadingTask = getDocument({
        data,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const pages = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();

        const pageText = textContent.items
            .map((item) => ("str" in item ? item.str : ""))
            .join(" ")
            .trim();

        if (pageText) {
            pages.push(pageText);
        }
    }

    return normalizeResumeText(pages.join("\n\n"));
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

        const text = await extractTextFromPdf(file);

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
