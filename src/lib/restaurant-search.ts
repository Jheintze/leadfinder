import { searchLeads } from "@/lib/lead-search";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

type SearchAndSaveInput = {
  city: string;
  area?: string;
  businessType: string;
  cuisine?: string;
  limit: number;
};

export async function searchAndSaveRestaurants({
  city,
  area,
  businessType,
  cuisine,
  limit,
}: SearchAndSaveInput) {
  const normalizedCity = city.trim().toLowerCase();
  const normalizedArea = area?.trim().toLowerCase() || "";
  const normalizedBusinessType =
    businessType?.trim().toLowerCase() || "restaurant";
  const normalizedCuisine = cuisine?.trim().toLowerCase() || "";

  const newLeads: {
    id: string;
    source_id: string;
    name: string;
    address: string | null;
    website: string | null;
    email: string | null;
    city: string;
  }[] = [];
  const seenIds = new Set<string>();

  const { data: progress, error: progressLookupError } = await supabaseAdmin
    .from("search_progress")
    .select("next_offset")
    .eq("city", normalizedCity)
    .eq("area", normalizedArea)
    .eq("business_type", normalizedBusinessType)
    .eq("cuisine", normalizedCuisine)
    .maybeSingle();

  if (progressLookupError) {
    throw progressLookupError;
  }

  let offset = progress?.next_offset ?? 0;

  const batchSize = limit;

  while (newLeads.length < limit) {
    const remaining = limit - newLeads.length;

    const { leads, nextOffset } = await searchLeads({
      city: normalizedCity,
      area: normalizedArea || undefined,
      businessType: normalizedBusinessType,
      cuisine: normalizedCuisine || undefined,
      limit: batchSize,
      offset,
    });

    if (leads.length === 0) {
      break;
    }

    const uniqueLeads = leads.filter((lead) => {
      if (seenIds.has(lead.id)) {
        return false;
      }

      seenIds.add(lead.id);
      return true;
    });

    const sourceIds = uniqueLeads.map((lead) => lead.id);

    const { data: existingRestaurants, error: lookupError } =
      await supabaseAdmin
        .from("restaurants")
        .select("source_id")
        .in("source_id", sourceIds);

    if (lookupError) {
      throw lookupError;
    }

    const existingIds = new Set(
      (existingRestaurants ?? []).map((restaurant) => restaurant.source_id),
    );

    const freshLeads = uniqueLeads
      .filter((lead) => !existingIds.has(lead.id))
      .slice(0, remaining);

    if (freshLeads.length > 0) {
      const restaurants = freshLeads.map((lead) => ({
        source_id: lead.id,
        name: lead.businessName,
        address: lead.location,
        website: lead.website,
        email: lead.email,
        city: normalizedCity,
        cuisine: normalizedCuisine,
      }));

      const { data: savedRestaurants, error: insertError } = await supabaseAdmin
        .from("restaurants")
        .upsert(restaurants, {
          onConflict: "source_id",
          ignoreDuplicates: true,
        })
        .select("id, source_id, name, address, website, email, city, cuisine");

      if (insertError) {
        throw insertError;
      }

      newLeads.push(...(savedRestaurants ?? []));
    }

    if (nextOffset !== null) {
      const { error: progressError } = await supabaseAdmin
        .from("search_progress")
        .upsert(
          {
            city: normalizedCity,
            area: normalizedArea,
            business_type: normalizedBusinessType,
            cuisine: normalizedCuisine,
            next_offset: nextOffset,
          },
          {
            onConflict: "city,area,business_type,cuisine",
          },
        );

      if (progressError) {
        throw progressError;
      }
    }

    if (nextOffset === null) {
      break;
    }

    offset = nextOffset;
  }

  return newLeads;
}
