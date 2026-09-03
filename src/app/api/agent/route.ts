import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  const { task } = await request.json();

  const response = await openai.responses.create({
    model: "gpt-5-mini",
    input: task,
  });

  return NextResponse.json({
    message: response.output_text,
  });
}