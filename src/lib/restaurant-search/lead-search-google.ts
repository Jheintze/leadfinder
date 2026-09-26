export type LeadStatus = "Ready" | "Needs review";

export type Lead = {
  /** Google Place ID: use this as the stable external identifier. */
  id: string;
  businessName: string;
  website: string | null;
  location: string;
  status: LeadStatus;
};

export type LeadSearchInput = { city: string; businessType: string; limit: number };

type GooglePlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  websiteUri?: string;
};

type GooglePlacesResponse = {
  places?: GooglePlace[];
  nextPageToken?: string;
  error?: { message?: string };
};

const GOOGLE_PLACES_ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const FIELD_MASK = "places.id,places.displayName,places.formattedAddress,places.websiteUri,nextPageToken";

async function searchGooglePlaces(
  apiKey: string,
  textQuery: string,
  pageSize: number,
  pageToken?: string,
): Promise<GooglePlacesResponse> {
  const response = await fetch(GOOGLE_PLACES_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({ textQuery, pageSize, ...(pageToken ? { pageToken } : {}) }),
    cache: "no-store",
  });

  const data = (await response.json()) as GooglePlacesResponse;
  if (!response.ok) {
    throw new Error(data.error?.message || "Google Places search failed.");
  }

  return data;
}

/**
 * Google Places Text Search adapter. Keeping provider code here means the API
 * route and dashboard can retain their current contract if the provider changes.
 */
export async function searchLeads({ city, businessType, limit }: LeadSearchInput): Promise<Lead[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("Restaurant search is not configured. Add GOOGLE_PLACES_API_KEY to your environment.");
  }

  const textQuery = `${businessType.trim() || "Restaurant"} in ${city.trim()}`;
  const leads: Lead[] = [];
  let pageToken: string | undefined;

  do {
    const response = await searchGooglePlaces(apiKey, textQuery, Math.min(20, limit - leads.length), pageToken);
    const pageLeads = (response.places ?? []).flatMap((place): Lead[] => {
      if (!place.id || !place.displayName?.text) return [];
      const website = place.websiteUri ?? null;
      return [{
        id: place.id,
        businessName: place.displayName.text,
        website,
        location: place.formattedAddress ?? city.trim(),
        status: website ? "Ready" : "Needs review",
      }];
    });
    leads.push(...pageLeads);
    pageToken = response.nextPageToken;
  } while (leads.length < limit && pageToken);

  return leads.slice(0, limit);
}
