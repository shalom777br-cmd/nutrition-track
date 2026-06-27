import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenAI } from "@google/genai";

/**
 * Geminiクライアント
 */
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY!,
});

/**
 * ===== 型定義（App.tsxと完全一致）=====
 */

type Item = {
  originalName: string;
  japaneseName: string;
  price: number;
  quantity: string;
  nutrition: {
    calories: number;
    protein: number;
    fat: number;
    carbohydrates: number;
  };
};

type ResponseData = {
  items: Item[];
  advisorFeedback: string;
};

type InputData = {
  text?: string;
  imageBase64?: string;
  receiptBase64?: string;
  audioBase64?: string;
};

/**
 * ===== API本体 =====
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseData | { error: string }>
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      text,
      imageBase64,
      receiptBase64,
      audioBase64,
    }: InputData = req.body;

    // 入力統合（ここがAIに渡す1本のプロンプトになる）
    const prompt = buildUnifiedPrompt({
      text,
      imageBase64,
      receiptBase64,
      audioBase64,
    });

    // 次のパートで：AI呼び出し＋パース処理
      // 2. Gemini呼び出し（テキストのみ）
    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: prompt,
    });

    const rawText = result?.text ?? "";

    // 3. JSON抽出
    const parsed = safeParseJSON(rawText);

    // 4. App.tsx互換レスポンス保証
    const response: ResponseData = {
      items: parsed.items ?? [],
      advisorFeedback:
        parsed.advisorFeedback ?? "解析が完了しました。",
    };

    return res.status(200).json(response);

  } catch (err: any) {
    console.error("analyze error:", err);

    return res.status(500).json({
      items: [],
      advisorFeedback: "サーバーエラーが発生しました",
    });
  }
  }
function buildUnifiedPrompt(input: InputData): string {
  return `
あなたは「栄養解析AI」です。

ユーザーの日本語入力から、食品・商品・食事内容を解析してください。

---

# 【絶対ルール】
- 必ずJSONのみを返す（説明文は禁止）
- itemsは必ず配列
- 1件も見つからない場合は空配列 []
- 数値はすべて推定でOK
- 日本語名は必ず付ける
- originalNameは入力に近い原文
- advisorFeedbackは簡潔なアドバイス

---

# 【出力フォーマット（厳守）】

{
  "items": [
    {
      "originalName": "",
      "japaneseName": "",
      "price": 0,
      "quantity": "",
      "nutrition": {
        "calories": 0,
        "protein": 0,
        "fat": 0,
        "carbohydrates": 0
      }
    }
  ],
  "advisorFeedback": ""
}

---

# 【入力】

テキスト：
${input.text ?? ""}

---

# 【重要】
- ```json も禁止

`;
}
