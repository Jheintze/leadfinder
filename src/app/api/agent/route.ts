import OpenAI from "openai";
import { NextResponse } from "next/server";
import { searchAndSaveRestaurants } from "@/lib/restaurant-search";
import { findAndSaveEmails } from "@/lib/email-finder";
import { getRestaurantsForOutreach } from "@/lib/outreach-server";

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

      Tool rules:
- If the user asks to find restaurant emails and does not provide restaurant IDs, use the find_emails tool with restaurantIds set to null.
- Do not ask the user for a city, area, cuisine, or restaurant IDs when they simply ask to find emails.
- find_emails searches restaurant leads already saved in the database.
- Use search_restaurants only when the user explicitly asks to find or search for restaurants.
- Do not use search_restaurants just because the user asks for emails.
    `,

    tools: [
      {
        type: "function",
        name: "search_restaurants",
        description:
          "Search for NEW restaurant leads in a specific city, optionally limited to an area and cuisine. Use this tool only when the user explicitly asks to find, search for, or discover restaurants. Do not use this tool when the user asks to find email addresses for existing leads.",
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
          "Find publicly listed email addresses for restaurant leads already saved in the database. Use this tool when the user asks to find, get, or search for restaurant emails. Do not search for or create new restaurants.",
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

    let toolOutput: string;

    if (toolCall.name === "search_restaurants") {
      const toolArguments = JSON.parse(toolCall.arguments);

      const restaurants = await searchAndSaveRestaurants({
        city: toolArguments.city,
        area: toolArguments.area ?? undefined,
        businessType: toolArguments.businessType,
        cuisine: toolArguments.cuisine ?? undefined,
        limit: toolArguments.limit,
      });

      toolOutput = JSON.stringify(restaurants);
    } else if (toolCall.name === "find_emails") {
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

      toolOutput = JSON.stringify(foundResults);
    } else if (toolCall.name === "generate_outreach") {
      const toolArguments = JSON.parse(toolCall.arguments);

      const restaurants = await getRestaurantsForOutreach(
        toolArguments.restaurantIds,
      );

      const template = {
        subject: "A quick idea for {restaurant_name}",
        body: `Hi {restaurant_name},

I’m building DishBoost, a tool that helps restaurants turn their food photos into social media content.

I’d love to give you a free trial and get your feedback.

Best,
Jakob`,
      };

      toolOutput = JSON.stringify({
        restaurantCount: restaurants.length,
        template,
      });
    } else {
      return NextResponse.json({
        message: "Unknown tool call.",
      });
    }

    currentResponse = await openai.responses.create({
      model: "gpt-4.1-mini",

      instructions: `
        You are the LeadFinder agent.

        Continue working on the user's original request using the available tools.
        If another tool is needed to complete the request, call it.
        Do not ask the user for information that can be obtained from the previous tool results.

        Only give a final response when the user's request is complete.

        When presenting restaurant search results:
        - List restaurants clearly and separately.
        - Include name, address, and website.
        - Do not use Markdown links.

        When presenting email results:
        - List each restaurant with its name, address, and email.
        - Do not include restaurants where no email was found.
        - If fewer emails were found than requested, say how many were found.

        When presenting outreach:
        - Clearly separate the outreach preview from explanatory text.
        - Show the subject and body clearly.
        - Keep {restaurant_name} as the placeholder.
        - Explain that the placeholder will be replaced for each restaurant.
        - Never send emails as part of generate_outreach.
      `,

      tools: [
        {
          type: "function",
          name: "search_restaurants",
          description:
            "Search for NEW restaurant leads in a specific city, optionally limited to an area and cuisine. Use this tool only when the user explicitly asks to find, search for, or discover restaurants. Do not use this tool when the user asks to find email addresses for existing leads.",
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
            "Find publicly listed email addresses for restaurant leads already saved in the database. Use this tool when the user asks to find, get, or search for restaurant emails. Do not search for or create new restaurants.",
          strict: true,
          parameters: {
            type: "object",
            properties: {
              limit: {
                type: "number",
                description:
                  "The maximum number of restaurant leads to process.",
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

      previous_response_id: currentResponse.id,

      input: [
        {
          type: "function_call_output",
          call_id: toolCall.call_id,
          output: toolOutput,
        },
      ],
    });
  }
}
