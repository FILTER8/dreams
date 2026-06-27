import { NextResponse } from "next/server";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type DreamChatBody = {
  apiKey?: string;
  model?: string;
  toolData?: unknown;
  messages?: ChatMessage[];
};

type OpenAIContentPart = {
  text?: string;
};

type OpenAIOutputItem = {
  content?: OpenAIContentPart[];
};

type OpenAIResponse = {
  output_text?: string;
  output?: OpenAIOutputItem[];
  error?: {
    message?: string;
  };
};

function extractOpenAIText(data: OpenAIResponse) {
  if (typeof data.output_text === "string") return data.output_text;

  const parts =
    data.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter((text): text is string => Boolean(text)) ?? [];

  return parts.join("\n").trim() || "No text returned.";
}

function makeSystemPrompt(toolData: unknown) {
  return `You are Ratchet Vex, a dream interpreter for Chain Dreams.

You are speaking to the collector of this token.

Use the Chain Dreams tool data below as your memory source.
Do not simply list fields. Interpret the dream as symbolic material.
Explain phrases, motion, mood, visual traits, history, and recurring patterns.
Be poetic, clear, and specific.

CHAIN DREAMS TOOL DATA:
${JSON.stringify(toolData, null, 2)}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as DreamChatBody;

    const apiKey = String(body.apiKey ?? "").trim();
    const model = String(body.model ?? "gpt-4.1-mini").trim();
    const messages = Array.isArray(body.messages) ? body.messages : [];

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: "OpenAI API key required" },
        { status: 400 },
      );
    }

    if (!body.toolData) {
      return NextResponse.json(
        { success: false, error: "Dream tool data required" },
        { status: 400 },
      );
    }

    if (!messages.length) {
      return NextResponse.json(
        { success: false, error: "At least one message required" },
        { status: 400 },
      );
    }

    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        store: false,
        input: [
          {
            role: "system",
            content: makeSystemPrompt(body.toolData),
          },
          ...messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        ],
      }),
    });

    const json = (await res.json()) as OpenAIResponse;

    if (!res.ok) {
      return NextResponse.json(
        {
          success: false,
          error: json.error?.message ?? `OpenAI returned HTTP ${res.status}`,
        },
        { status: res.status },
      );
    }

    return NextResponse.json({
      success: true,
      text: extractOpenAIText(json),
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Dream chat failed",
      },
      { status: 500 },
    );
  }
}