import { supabase } from "@/lib/supabase";

export type LeadStatus = "Website found" | "Website missing";

export type Lead = {
  id: string;
  businessName: string;
  website: string | null;
  email: string | null;
  location: string;
  status: LeadStatus;
};

export type LeadSearchInput = {
  city: string;
  businessType: string;
  limit: number;
  offset?: number;
};

type CityCoordinates = {
  latitude: number;
  longitude: number;
};

type NominatimResult = {
  lat: string;
  lon: string;
  display_name?: string;
};

type OpenPlacesAddress = {
  street?: string;
  housenumber?: string;
  postcode?: string;
  locality?: string;
  city?: string;
  region?: string;
  country?: string;
  country_code?: string;
};

type OpenPlace = {
  place_id: string;
  name?: string;
  lat: number;
  lon: number;
  address?: OpenPlacesAddress;
  phone?: string;
  website?: string;
};

type OpenPlacesResponse = {
  results?: OpenPlace[];
  meta?: {
    next_offset?: number | null;
  };
};

const NOMINATIM_ENDPOINT = "https://nominatim.openstreetmap.org/search";

const OPEN_PLACES_ENDPOINT = "https://api.openplacesapi.com/v1/places";

const OPEN_PLACES_API_KEY = process.env.OPEN_PLACES_API_KEY;

async function getCityCoordinates(city: string): Promise<CityCoordinates> {
  const normalizedCity = city.trim().toLowerCase();

  // Check our Supabase cache first.
  const { data: cachedCity, error: cacheError } = await supabase
    .from("city_coordinates")
    .select("latitude, longitude")
    .eq("city", normalizedCity)
    .maybeSingle();

  if (cacheError) {
    throw new Error(
      `Failed to read city coordinates cache: ${cacheError.message}`,
    );
  }

  if (cachedCity) {
    return {
      latitude: cachedCity.latitude,
      longitude: cachedCity.longitude,
    };
  }

  // City isn't cached, so geocode it with Nominatim.
  const params = new URLSearchParams({
    q: city.trim(),
    format: "jsonv2",
    featureType: "city",
    limit: "1",
  });

  const response = await fetch(`${NOMINATIM_ENDPOINT}?${params.toString()}`, {
    headers: {
      "User-Agent": "LeadFinder/1.0 (restaurant lead generation MVP)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Nominatim geocoding failed (${response.status}): ${errorText}`,
    );
  }

  const results = (await response.json()) as NominatimResult[];

  const result = results[0];

  if (!result?.lat || !result?.lon) {
    throw new Error(`Could not find city: ${city.trim()}`);
  }

  const latitude = Number(result.lat);
  const longitude = Number(result.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error(`Invalid coordinates returned for: ${city.trim()}`);
  }

  // Cache the coordinates for future searches.
  const { error: insertError } = await supabase
    .from("city_coordinates")
    .insert({
      city: normalizedCity,
      latitude,
      longitude,
    });

  if (insertError) {
    throw new Error(`Failed to cache city coordinates: ${insertError.message}`);
  }

  return {
    latitude,
    longitude,
  };
}

function formatAddress(address?: OpenPlacesAddress): string {
  if (!address) {
    return "";
  }

  const street =
    address.street && address.housenumber
      ? `${address.street} ${address.housenumber}`
      : address.street;

  return [street, address.postcode, address.locality ?? address.city]
    .filter(Boolean)
    .join(", ");
}

export async function searchLeads({
  city,
  businessType,
  limit,
  offset = 0,
}: LeadSearchInput): Promise<Lead[]> {
  if (!OPEN_PLACES_API_KEY) {
    throw new Error("OPEN_PLACES_API_KEY is not configured.");
  }

  const trimmedCity = city.trim();
  const trimmedBusinessType = businessType.trim().toLowerCase();

  if (!trimmedCity) {
    throw new Error("City is required.");
  }

  if (!trimmedBusinessType) {
    throw new Error("Business type is required.");
  }

  const coordinates = await getCityCoordinates(trimmedCity);

  const params = new URLSearchParams({
    category: trimmedBusinessType,
    lat: String(coordinates.latitude),
    lon: String(coordinates.longitude),
    radius_mi: "25",
    limit: String(limit),
    offset: String(offset),
  });

  const response = await fetch(`${OPEN_PLACES_ENDPOINT}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${OPEN_PLACES_API_KEY}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `Open Places search failed (${response.status}): ${errorText}`,
    );
  }

  const data = (await response.json()) as OpenPlacesResponse;

  const leads: Lead[] = [];

  for (const place of data.results ?? []) {
    if (!place.place_id || !place.name) {
      continue;
    }

    const website = place.website ?? null;

    leads.push({
      id: place.place_id,
      businessName: place.name,
      website,
      email: null,
      location: formatAddress(place.address) || trimmedCity,
      status: website ? "Website found" : "Website missing",
    });
  }

  return leads;
}
