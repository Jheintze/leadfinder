import { findAndSaveEmails } from "@/lib/email-finder";
import { searchAndSaveRestaurants } from "@/lib/restaurant-search";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const CITY = "Munich";
const BUSINESS_TYPE = "restaurant";
const TARGET_EMAILS = 50;
const SEARCH_BATCH_SIZE = 50;
const MAX_RESTAURANTS = 300;

export async function prepareAutomationBatch() {
  const { data: batch, error: batchError } = await supabaseAdmin
    .from("automation_batches")
    .insert({
      status: "preparing",
      target_emails: TARGET_EMAILS,
      emails_found: 0,
      restaurant_ids: [],
      city: CITY,
      city_exhausted: false,
    })
    .select()
    .single();

  if (batchError || !batch) {
    throw batchError ?? new Error("Failed to create automation batch.");
  }

  const restaurantIdsWithEmails: string[] = [];
  let restaurantsProcessed = 0;
  let cityExhausted = false;

  try {
    while (
      restaurantIdsWithEmails.length < TARGET_EMAILS &&
      restaurantsProcessed < MAX_RESTAURANTS
    ) {
      const remainingRestaurants = MAX_RESTAURANTS - restaurantsProcessed;

      const searchLimit = Math.min(
        SEARCH_BATCH_SIZE,
        remainingRestaurants,
      );

      const restaurants = await searchAndSaveRestaurants({
        city: CITY,
        businessType: BUSINESS_TYPE,
        limit: searchLimit,
      });

      if (restaurants.length === 0) {
        cityExhausted = true;
        break;
      }

      restaurantsProcessed += restaurants.length;

      const results = await findAndSaveEmails({
        limit: restaurants.length,
        restaurantIds: restaurants.map((restaurant) => restaurant.id),
      });

      for (const result of results) {
        if (result.email) {
          restaurantIdsWithEmails.push(result.id);
        }
      }

      if (restaurantIdsWithEmails.length >= TARGET_EMAILS) {
        break;
      }

      if (restaurants.length < searchLimit) {
        cityExhausted = true;
        break;
      }
    }

    const selectedRestaurantIds = restaurantIdsWithEmails.slice(
      0,
      TARGET_EMAILS,
    );

    const { data: completedBatch, error: updateError } = await supabaseAdmin
      .from("automation_batches")
      .update({
        status: "ready",
        emails_found: selectedRestaurantIds.length,
        restaurant_ids: selectedRestaurantIds,
        city_exhausted: cityExhausted,
      })
      .eq("id", batch.id)
      .select()
      .single();

    if (updateError || !completedBatch) {
      throw updateError ?? new Error("Failed to update automation batch.");
    }

    return completedBatch;
  } catch (error) {
    await supabaseAdmin
      .from("automation_batches")
      .update({
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      })
      .eq("id", batch.id);

    throw error;
  }
}