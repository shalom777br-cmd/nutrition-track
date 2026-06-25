import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const { image, audio, text } = req.body;

    if (!image && !audio && !text) {
      return res.status(400).json({ error: "No input provided" });
    }

    const result = {
      message: "analysis success",
      received: {
        hasImage: !!image,
        hasAudio: !!audio,
        hasText: !!text,
      },
    };

    return res.status(200).json(result);

  } catch (error: any) {
    return res.status(500).json({
      error: "Server error",
      detail: error?.message ?? "unknown",
    });
  }
}
