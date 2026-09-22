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
  let preparedOutreach = null;

  const instructions = `
    You are the LeadFinder agent.

    LeadFinder is an internal tool for finding and contacting restaurant leads
    for DishBoost, an AI marketing assistant for restaurants.

    Your job is to help the user complete lead-generation tasks.
    Be concise and practical.

    Tool rules:
    - If the user asks to find restaurant emails and does not provide restaurant IDs,
      use the find_emails tool with restaurantIds set to null.
    - Do not ask the user for a city, area, cuisine, or restaurant IDs when they
      simply ask to find emails.
    - find_emails searches restaurant leads already saved in the database.
    - Use search_restaurants only when the user explicitly asks to find or search
      for restaurants.
    - Do not use search_restaurants just because the user asks for emails.

    Multi-step tasks:
    - If the user asks for multiple operations, complete all of them.
    - When outreach is prepared, explain that {restaurant_name} will be replaced
      with each restaurant's actual name when the emails are sent.
    - You may call multiple tools sequentially.
    - After a tool returns results, use those results to decide whether another
      tool is needed.
          - If the user only asks to find/search/discover restaurants, use search_restaurants
      and do not call find_emails afterward.
    - Do not infer that the user wants email addresses merely because restaurants
      have email fields or because the search result contains email information.
    - Only use find_emails when the user explicitly asks for email addresses, emails,
      contact information, or outreach that requires email addresses.
    - For example, if the user asks to find restaurants and then get their emails,
      first use search_restaurants, then use the restaurant IDs returned by that
      tool with find_emails.
    - If the user asks for outreach after finding restaurants/emails, use
      generate_outreach with the relevant restaurant IDs.
    - Do not stop after the first tool if the user's request is not complete.
       - Only apply the email-search workflow below when the user explicitly asks for
      restaurants with email addresses or asks for an email-dependent task such as outreach.
    - If the user only asks for a specific number of restaurants, return the restaurants
      found by search_restaurants and do not search for their emails.
    - When the user asks for a specific number of restaurants with emails, the final
      result should contain at most that requested number of restaurants with emails.
    - First search for the requested number of restaurants and check those exact
      restaurant IDs for emails.
    - If there are not enough usable email results, search for another batch of the
      same size and check those exact new restaurant IDs.
    - Make at most 3 restaurant-search batches total for this task.
    - Stop immediately once the requested number of usable email results has been found.
    - If the requested number cannot be reached after 3 batches, return the usable
      email results that were found.
    - Never include extra restaurants without emails in the final results just because
      they were searched.
    - When calling find_emails after search_restaurants, always pass the restaurant IDs
      returned by the restaurant search.
    - Do not mention the database, current database, saved leads, or internal data sources
      in your user-facing responses.
    - Describe search failures in terms of not finding matching restaurants or additional
      restaurants, not in terms of database contents.
    - When a restaurant search returns no new matching results, say that you
      could not find any additional matching restaurants. Do not imply that
      no restaurants of that type exist in the location.
    - When outreach is requested together with finding emails, do not prepare outreach until the email-search step is complete.
    - If find_emails reports needs_more=true, continue with the next restaurant-search batch and check those restaurants for emails before generating outreach.
    - Only generate outreach for restaurants that have email addresses.

    Email result wording:
    - Whenever the user asks for restaurants with emails, including when outreach is also requested,
      the final result must contain at most the requested number of restaurants with emails.
    - Never report the total number of restaurants searched as the number of restaurants found.
    - If fewer were found than requested, say "I found only X [cuisine] restaurants in [city] with email contacts:".
    - If the requested number was reached, say "I found X [cuisine] restaurants in [city] with email contacts:".
    - Do not describe restaurants without emails as successful results.
    - Do not emphasize how many restaurants were searched or checked.
  `;

  const tools = [
    {
      type: "function" as const,
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
      type: "function" as const,
      name: "find_emails",
      description:
        "Find publicly listed email addresses for restaurant leads that have already been found. Use this tool when the user asks to find, get, or search for restaurant emails. Do not search for or create new restaurants.",
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
      type: "function" as const,
      name: "generate_outreach",
      description:
        "Prepare an outreach email template for restaurant leads. Use this after the relevant restaurant IDs are known. This tool only prepares the outreach preview and never sends emails.",
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
  ];

  // Keep the entire conversation/tool history ourselves.
  // This avoids the previous_response_id / call_id issue.
  const inputItems: OpenAI.Responses.ResponseInputItem[] = [
    {
      role: "user",
      content: task,
    },
  ];

  while (true) {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      instructions,
      tools,
      input: inputItems,
    });

    const toolCalls = response.output.filter(
      (item) => item.type === "function_call",
    );

    // No more tools needed -> final answer.
    if (toolCalls.length === 0) {
      return NextResponse.json({
        message: response.output_text,
        outreach: preparedOutreach,
      });
    }

    // Add the model's tool calls to the conversation history.
    inputItems.push(...toolCalls);

    // Execute every tool call from this response.
    for (const toolCall of toolCalls) {
      const toolArguments = JSON.parse(toolCall.arguments);

      let toolOutput: unknown;

      if (toolCall.name === "search_restaurants") {
        console.log(
          "[AGENT] search_restaurants:",
          toolArguments.city,
          toolArguments.cuisine,
          "limit:",
          toolArguments.limit,
        );

        const restaurants = await searchAndSaveRestaurants({
          city: toolArguments.city,
          area: toolArguments.area ?? undefined,
          businessType: toolArguments.businessType,
          cuisine: toolArguments.cuisine ?? undefined,
          limit: toolArguments.limit,
        });

        toolOutput = restaurants;
      }

      if (toolCall.name === "find_emails") {
        console.log(
          "[AGENT] find_emails:",
          "limit:",
          toolArguments.limit,
          "restaurantIds:",
          toolArguments.restaurantIds,
        );
        const results = await findAndSaveEmails({
          limit: toolArguments.limit,
          restaurantIds: toolArguments.restaurantIds ?? undefined,
        });

        const foundResults = results.filter((result) => result.email);

        toolOutput = {
          requested: toolArguments.limit,
          found: foundResults.length,
          needs_more: foundResults.length < toolArguments.limit,
          results: foundResults,
        };
      }

      if (toolCall.name === "generate_outreach") {
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

        preparedOutreach = {
          restaurantCount: restaurants.length,
          template,
        };

        toolOutput = preparedOutreach;
      }

      // Give the result back to the model using the EXACT call_id
      // from the corresponding function call.
      inputItems.push({
        type: "function_call_output",
        call_id: toolCall.call_id,
        output: JSON.stringify(toolOutput),
      });
    }
  }
}
