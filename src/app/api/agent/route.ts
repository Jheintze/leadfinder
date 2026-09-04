import OpenAI from "openai";
import { NextResponse } from "next/server";
import { searchAndSaveRestaurants } from "@/lib/restaurant-search";

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

  tools: [
  {
    type: "function",
    name: "search_restaurants",
    description: "Search for restaurants in a city.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        city: {
          type: "string",
          description: "The city to search in.",
        },
        businessType: {
          type: "string",
          description: "The type of restaurant or business to search for.",
        },
        limit: {
          type: "number",
          description: "The maximum number of restaurants to find.",
        },
      },
      required: ["city", "businessType", "limit"],
      additionalProperties: false,
    },
  },
],

  input: task,
});

 const toolCall = response.output.find(
  (item) => item.type === "function_call",
);

if (toolCall) {
  console.log("Tool requested:", toolCall.name);
  console.log("Arguments:", toolCall.arguments);

  if (toolCall.name === "search_restaurants") {
    const toolArguments = JSON.parse(toolCall.arguments);

    const restaurants = await searchAndSaveRestaurants({
      city: toolArguments.city,
      businessType: toolArguments.businessType,
      limit: toolArguments.limit,
    });

    const followUp = await openai.responses.create({
      model: "gpt-4.1-mini",
      instructions: `
        You are the LeadFinder agent.

        The requested restaurant search has been completed.
        Give the user a concise summary of the results.
      `,
      input: [
        ...response.output,
        {
          type: "function_call_output",
          call_id: toolCall.call_id,
          output: JSON.stringify(restaurants),
        },
      ],
    });

    return NextResponse.json({
      message: followUp.output_text,
    });
  }
}

return NextResponse.json({
  message: response.output_text,
});
}