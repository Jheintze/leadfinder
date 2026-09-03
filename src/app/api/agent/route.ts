import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  const { task } = await request.json();

  const response = await openai.responses.create({
  model: "gpt-4.1-mini",
  instructions: `
    You are the LeadFinder agent.

    LeadFinder is an internal tool for finding and contacting restaurant leads
    for DishBoost, an AI marketing assistant for restaurants.

    Your job is to help the user complete lead-generation tasks.
    Be concise and practical.
  `,
  input: task,
});

  return NextResponse.json({
    message: response.output_text,
  });
}