import OpenAI from "openai"
import { toFile } from "openai/uploads"

export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get("file")

    if (!(file instanceof File)) {
      return Response.json({ error: "Missing audio file" }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return Response.json({ error: "Missing OPENAI_API_KEY" }, { status: 500 })
    }

    const openai = new OpenAI({ apiKey })

    const buffer = Buffer.from(await file.arrayBuffer())
    const uploadable = await toFile(buffer, file.name || "audio.webm", {
      type: file.type || "audio/webm",
    })

    const transcript = await openai.audio.transcriptions.create({
      model: "gpt-4o-mini-transcribe",
      file: uploadable,
    })

    return Response.json({ text: transcript.text || "" })
  } catch (err: any) {
    return Response.json(
      { error: err?.message || "Transcription failed" },
      { status: 500 }
    )
  }
}
