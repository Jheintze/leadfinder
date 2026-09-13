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
          "Find publicly listed email addresses for restaurant leads. If restaurant IDs are available from a previous restaurant search, use those IDs so the email search applies to those exact restaurants.",
        strict: true,
        parameters: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "The maximum number of restaurant leads to process.",
            },
            restaurantIds: {
              type: ["array", "null"],
              items: {
                type: "string",
              },
              description:
                "The IDs of specific restaurant leads to process. Use null when no specific restaurant IDs are available.",
            },
          },
          required: ["limit", "restaurantIds"],
          additionalProperties: false,
        },
      },
      {
        type: "function",
        name: "generate_outreach",
        description:
          "Generate outreach email drafts for restaurant leads using the current outreach template.",
        strict: true,
        parameters: {
          type: "object",
          properties: {
            restaurantIds: {
              type: "array",
              items: {
                type: "string",
              },
              description:
                "The IDs of the restaurant leads to create outreach drafts for.",
            },
          },
          required: ["restaurantIds"],
          additionalProperties: false,
        },
      },
    ],

    input: task,
  });

  let currentResponse = response;

  while (true) {
    const toolCall = currentResponse.output.find(
      (item) => item.type === "function_call",
    );

    if (!toolCall) {
      return NextResponse.json({
        message: currentResponse.output_text,
      });
    }

    if (toolCall.name === "search_restaurants") {
      const toolArguments = JSON.parse(toolCall.arguments);

      const restaurants = await searchAndSaveRestaurants({
        city: toolArguments.city,
        area: toolArguments.area ?? undefined,
        businessType: toolArguments.businessType,
        cuisine: toolArguments.cuisine ?? undefined,
        limit: toolArguments.limit,
      });

      currentResponse = await openai.responses.create({
        model: "gpt-4.1-mini",
        instructions: `
        You are the LeadFinder agent.

        Continue helping the user complete their requested task.
        Use another tool if more work is needed.
        If the task is complete, give a concise final answer.
      `,
        input: [
          {
            type: "function_call_output",
            call_id: toolCall.call_id,
            output: JSON.stringify(restaurants),
          },
        ],
      });

      continue;
    }

    if (toolCall.name === "find_emails") {
      const toolArguments = JSON.parse(toolCall.arguments);

      const targetCount = toolArguments.limit;
      const allResults = [];

      while (allResults.filter((result) => result.email).length < targetCount) {
        const remaining =
          targetCount - allResults.filter((result) => result.email).length;

        const results = await findAndSaveEmails({
          limit: remaining,
          restaurantIds: toolArguments.restaurantIds ?? undefined,
        });

        if (results.length === 0) {
          break;
        }

        allResults.push(...results);
      }

      const foundResults = allResults.filter((result) => result.email);

      currentResponse = await openai.responses.create({
        model: "gpt-4.1-mini",
        instructions: `
        You are the LeadFinder agent.

        Continue helping the user complete their requested task.
        Use another tool if more work is needed.
        If the task is complete, give a concise final answer.
      `,
        input: [
          {
            type: "function_call_output",
            call_id: toolCall.call_id,
            output: JSON.stringify(foundResults),
          },
        ],
      });

      continue;
    }

    if (toolCall.name === "generate_outreach") {
      // We will implement this next.
      return NextResponse.json({
        message: "generate_outreach reached.",
      });
    }
  }

  return NextResponse.json({
    message: response.output_text,
  });
}
