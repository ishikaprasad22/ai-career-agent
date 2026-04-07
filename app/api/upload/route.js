export const runtime = "nodejs";

export async function POST(req) {
    try {
        const formData = await req.formData();
        const file = formData.get("file");

        if (!(file instanceof File)) {
            return Response.json({ error: "No file uploaded" }, { status: 400 });
        }

        if (file.type && file.type !== "application/pdf") {
            return Response.json({ error: "Only PDF files are supported" }, { status: 400 });
        }

        if (file.size === 0) {
            return Response.json({ error: "Uploaded PDF is empty" }, { status: 400 });
        }

        const mod = await import("pdf-parse");
        const pdfParse = mod.default || mod;

        const buffer = Buffer.from(await file.arrayBuffer());


        const data = await pdfParse(buffer);

        return Response.json({ text: data.text || "" });

    } catch (err) {
        console.error("UPLOAD ERROR:", err);

        return Response.json(
            { error: err.message || "Upload failed" },
            { status: 500 }
        );
    }
}