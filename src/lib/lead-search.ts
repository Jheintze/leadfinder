import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
  boundary: unknown;
  boundingbox: [string, string, string, string];
};

type NominatimResult = {
  lat: string;
  lon: string;
  display_name?: string;
  geojson?: unknown;
  boundingbox?: [string, string, string, string];
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
  distance_mi?: number;
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

const MAX_RADIUS_MI = 25;

async function getLocationCoordinates(
  city: string,
  area?: string,
): Promise<LocationCoordinates> {
  const normalizedCity = city.trim().toLowerCase();
  const normalizedArea = area?.trim().toLowerCase() || null;

  let cacheQuery = supabaseAdmin
    .from("location_coordinates")
    .select("latitude, longitude, boundary, boundingbox")
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
      boundingbox: cachedLocation.boundingbox,
    };
  }

  const location = normalizedArea ? `${area}, ${city}` : city;

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

  if (!result.boundingbox || result.boundingbox.length !== 4) {
    throw new Error(`No bounding box returned for: ${location.trim()}`);
  }

  const { error: insertError } = await supabaseAdmin
    .from("location_coordinates")
    .insert({
      city: normalizedCity,
      area: normalizedArea,
      boundary: result.geojson,
      boundingbox: result.boundingbox,
      latitude,
      longitude,
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
    boundingbox: result.boundingbox,
  };
}

function calculateDistanceMiles(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number,
): number {
  const earthRadiusMiles = 3958.8;

  const latitudeDifference = ((latitude2 - latitude1) * Math.PI) / 180;
  const longitudeDifference = ((longitude2 - longitude1) * Math.PI) / 180;

  const latitude1Radians = (latitude1 * Math.PI) / 180;
  const latitude2Radians = (latitude2 * Math.PI) / 180;

  const a =
    Math.sin(latitudeDifference / 2) ** 2 +
    Math.cos(latitude1Radians) *
      Math.cos(latitude2Radians) *
      Math.sin(longitudeDifference / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMiles * c;
}

function calculateSearchRadius(
  latitude: number,
  longitude: number,
  boundingbox: [string, string, string, string],
): number {
  const [south, north, west, east] = boundingbox.map(Number);

  if (
    !Number.isFinite(south) ||
    !Number.isFinite(north) ||
    !Number.isFinite(west) ||
    !Number.isFinite(east)
  ) {
    return MAX_RADIUS_MI;
  }

  const distancesToCorners = [
    calculateDistanceMiles(latitude, longitude, south, west),
    calculateDistanceMiles(latitude, longitude, south, east),
    calculateDistanceMiles(latitude, longitude, north, west),
    calculateDistanceMiles(latitude, longitude, north, east),
  ];

  const radius = Math.max(...distancesToCorners);

  return Math.min(Math.ceil(radius), MAX_RADIUS_MI);
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
}: LeadSearchInput): Promise<{
  leads: Lead[];
  nextOffset: number | null;
}> {
  if (!OPEN_PLACES_API_KEY) {
    throw new Error("OPEN_PLACES_API_KEY is not configured.");
  }

  const trimmedCity = city.trim();
  const trimmedBusinessType = businessType.trim().toLowerCase();
  const trimmedCuisine = cuisine?.trim() || "";

  if (!trimmedCity) {
    throw new Error("City is required.");
  }

  if (!trimmedBusinessType) {
    throw new Error("Business type is required.");
  }

  const coordinates = await getLocationCoordinates(trimmedCity, area);

  const radiusMiles = calculateSearchRadius(
    coordinates.latitude,
    coordinates.longitude,
    coordinates.boundingbox,
  );
  console.log("SEARCH RADIUS:", {
    city: trimmedCity,
    area: area ?? null,
    radiusMiles,
    boundingbox: coordinates.boundingbox,
  });

  const params = new URLSearchParams({
    category: trimmedBusinessType,
    lat: String(coordinates.latitude),
    lon: String(coordinates.longitude),
    radius_mi: String(radiusMiles),
    limit: String(limit),
    offset: String(offset),
  });

  if (trimmedCuisine) {
    params.set("q", trimmedCuisine);
  }
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

  console.log(
    "OPEN PLACES DISTANCES:",
    (data.results ?? []).map((place) => ({
      name: place.name,
      distanceMiles: place.distance_mi,
    })),
  );

  const leads: Lead[] = [];

  for (const place of data.results ?? []) {
    if (!place.place_id || !place.name) {
      continue;
    }

    if (typeof place.lat !== "number" || typeof place.lon !== "number") {
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
