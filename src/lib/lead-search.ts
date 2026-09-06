import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import type { Polygon, MultiPolygon } from "geojson";

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
  area?: string;
  businessType: string;
  cuisine?: string;
  limit: number;
  offset?: number;
};

type LocationCoordinates = {
  latitude: number;
  longitude: number;
  boundary: Polygon | MultiPolygon;
};

type NominatimResult = {
  lat: string;
  lon: string;
  display_name?: string;
  geojson?: Polygon | MultiPolygon;
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

async function getLocationCoordinates(
  city: string,
  area?: string,
): Promise<LocationCoordinates> {
  const normalizedCity = city.trim().toLowerCase();
  const normalizedArea = area?.trim().toLowerCase() || null;

  // Check our Supabase cache first.
  let cacheQuery = supabaseAdmin
    .from("location_coordinates")
    .select("latitude, longitude, boundary")
    .eq("city", normalizedCity);

  if (normalizedArea) {
    cacheQuery = cacheQuery.eq("area", normalizedArea);
  } else {
    cacheQuery = cacheQuery.is("area", null);
  }

  const { data: cachedLocation, error: cacheError } =
    await cacheQuery.maybeSingle();

  if (cacheError) {
    throw new Error(
      `Failed to read location coordinates cache: ${cacheError.message}`,
    );
  }

  if (cachedLocation) {
    return {
      latitude: cachedLocation.latitude,
      longitude: cachedLocation.longitude,
      boundary: cachedLocation.boundary,
    };
  }

  // Build the location name that Nominatim should search for.
  const location = normalizedArea ? `${area}, ${city}` : city;

  // Location isn't cached, so geocode it with Nominatim.
  const params = new URLSearchParams({
    q: location.trim(),
    format: "jsonv2",
    limit: "1",
    polygon_geojson: "1",
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
    throw new Error(`Could not find location: ${location.trim()}`);
  }

  const latitude = Number(result.lat);
  const longitude = Number(result.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw new Error(`Invalid coordinates returned for: ${location.trim()}`);
  }

  if (!result.geojson) {
    throw new Error(`No boundary returned for: ${location.trim()}`);
  }

  // Cache the location for future searches.
  const { error: insertError } = await supabaseAdmin
    .from("location_coordinates")
    .insert({
      city: normalizedCity,
      area: normalizedArea,
      latitude,
      longitude,
      boundary: result.geojson,
    });

  if (insertError) {
    throw new Error(
      `Failed to cache location coordinates: ${insertError.message}`,
    );
  }

  return {
    latitude,
    longitude,
    boundary: result.geojson,
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
  area,
  businessType,
  cuisine,
  limit,
  offset = 0,
}: LeadSearchInput): Promise<{ leads: Lead[]; nextOffset: number | null }> {
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

  const coordinates = await getLocationCoordinates(trimmedCity, area);

  const leads: Lead[] = [];
  let currentOffset = offset;

  while (leads.length < limit) {
    const remaining = limit - leads.length;

    const params = new URLSearchParams({
      category: trimmedBusinessType,
      lat: String(coordinates.latitude),
      lon: String(coordinates.longitude),
      radius_mi: "25",
      limit: String(limit),
      offset: String(offset),
    });

    const response = await fetch(
      `${OPEN_PLACES_ENDPOINT}?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${OPEN_PLACES_API_KEY}`,
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        `Open Places search failed (${response.status}): ${errorText}`,
      );
    }

    const data = (await response.json()) as OpenPlacesResponse;

    const leads: Lead[] = [];

    for (const place of data.results ?? []) {
      if (!place.place_id || !place.name) continue;

      if (typeof place.lat !== "number" || typeof place.lon !== "number") {
        continue;
      }

      // Exact geographical filtering.
      // Open Places radius is only used to retrieve candidates.
      const insideBoundary = booleanPointInPolygon(
        [place.lon, place.lat],
        coordinates.boundary,
      );

      if (!insideBoundary) {
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

    return {
      leads,
      nextOffset: data.meta?.next_offset ?? null,
    };
  }
}
