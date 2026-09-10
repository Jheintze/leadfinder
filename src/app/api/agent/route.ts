import OpenAI from "openai";
import { NextResponse } from "next/server";
import { searchAndSaveRestaurants } from "@/lib/restaurant-search";
import { findAndSaveEmails } from "@/lib/email-finder";

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
        description:
          "Search for businesses in a city, optionally limited to a specific area and cuisine.",
        strict: true,
        parameters: {
          type: "object",
          properties: {
            city: {
              type: "string",
              description: "The city to search in.",
            },
            area: {
              type: ["string", "null"],
              description:
                "The specific area, neighborhood, or district within the city. Use null if no specific area was requested.",
            },
            businessType: {
              type: "string",
              description:
                "The type of business to search for. Use a valid Overture category such as 'restaurant', 'cafe', or 'bar'. Do not include cuisine names like sushi or Italian.",
            },
            cuisine: {
              type: ["string", "null"],
              description:
                "The cuisine requested, such as 'sushi', 'Italian', or 'Mexican'. Use null if no cuisine was requested.",
            },
            limit: {
              type: "number",
              description: "The maximum number of businesses to find.",
            },
          },
          required: ["city", "area", "businessType", "cuisine", "limit"],
          additionalProperties: false,
        },
      },
      {
        type: "function",
        name: "find_emails",
        description:
          "Find publicly listed email addresses for existing restaurant leads.",
        strict: true,
        parameters: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "The maximum number of restaurant leads to process.",
            },
          },
          required: ["limit"],
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
    if (toolCall.name === "search_restaurants") {
      const toolArguments = JSON.parse(toolCall.arguments);

      const restaurants = await searchAndSaveRestaurants({
        city: toolArguments.city,
        area: toolArguments.area ?? undefined,
        businessType: toolArguments.businessType,
        cuisine: toolArguments.cuisine ?? undefined,
        limit: toolArguments.limit,
      });

      const followUp = await openai.responses.create({
        model: "gpt-4.1-mini",
        instructions: `
       You are the LeadFinder agent.

  The requested restaurant search has been completed.

  Present the results clearly and easy to scan.

  Start with a short introduction.
  Then list each restaurant as a separate numbered item.
  For each restaurant, include the name, address, and website.
  Put each restaurant on its own line/block.
  Finish with a short follow-up question.

  Do not put all restaurants into one paragraph.
      `,
        input: [
          toolCall,
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
    if (toolCall.name === "find_emails") {
      const toolArguments = JSON.parse(toolCall.arguments);

      const results = await findAndSaveEmails({
        limit: toolArguments.limit,
      });

      const followUp = await openai.responses.create({
        model: "gpt-4.1-mini",
        instructions: `
        You are the LeadFinder agent.

        The requested email search has been completed.

        Present the results clearly and easy to scan.

        Start with a short introduction.
        Then list each restaurant as a separate numbered item.
        For each restaurant, include the name, address, and email.
        If no email was found, say "Email: Not found".
        Put each restaurant in its own line/block.
        Finish with a short follow-up question.

        Do not put all restaurants into one paragraph.
      `,
        input: [
          toolCall,
          {
            type: "function_call_output",
            call_id: toolCall.call_id,
            output: JSON.stringify(results),
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
