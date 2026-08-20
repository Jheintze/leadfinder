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
};

type OverpassElement = {
  type: string;
  id: number;
  tags?: {
    name?: string;
    website?: string;
    "contact:website"?: string;
    email?: string;
    "contact:email"?: string;
    "addr:street"?: string;
    "addr:housenumber"?: string;
    "addr:postcode"?: string;
    "addr:city"?: string;
  };
};

type OverpassResponse = {
  elements?: OverpassElement[];
};

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";

export async function searchLeads({
  city,
  businessType,
  limit,
}: LeadSearchInput): Promise<Lead[]> {
  const query = `
    [out:json][timeout:25];

    area["name"="${city.trim()}"]["boundary"="administrative"]->.searchArea;

    (
      nwr["amenity"="${businessType.trim().toLowerCase()}"](area.searchArea);
    );

    out tags center;
  `;

  const response = await fetch(OVERPASS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "LeadFinder/1.0",
    },
    body: `data=${encodeURIComponent(query)}`,
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      `OpenStreetMap search failed (${response.status}): ${errorText}`,
    );
  }

  const data = (await response.json()) as OverpassResponse;

  const leads: Lead[] = [];

  for (const element of data.elements ?? []) {
    const tags = element.tags;

    if (!tags?.name) {
      continue;
    }

    const website = tags.website ?? tags["contact:website"] ?? null;
    const email = tags.email ?? tags["contact:email"] ?? null;

    const address = [
      tags["addr:street"] && tags["addr:housenumber"]
        ? `${tags["addr:street"]} ${tags["addr:housenumber"]}`
        : tags["addr:street"],
      tags["addr:postcode"],
      tags["addr:city"],
    ]
      .filter(Boolean)
      .join(", ");

    leads.push({
      id: `${element.type}/${element.id}`,
      businessName: tags.name,
      website,
      email,
      location: address || city.trim(),
      status: website ? "Website found" : "Website missing",
    });

    if (leads.length >= limit) {
      break;
    }
  }

  return leads;
}
