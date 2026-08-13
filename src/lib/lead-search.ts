export type LeadStatus = "Ready" | "Needs review";

export type Lead = {
  id: string;
  businessName: string;
  website: string;
  email: string;
  location: string;
  status: LeadStatus;
};

export type LeadSearchInput = { city: string; businessType: string; limit: number };

const businesses = [
  ["Juniper Table", "hello@junipertable.example"], ["Mosaic Kitchen", "team@mosaickitchen.example"],
  ["Olive & Ember", "contact@oliveember.example"], ["North Star Dining", "hello@northstardining.example"],
  ["The Daily Grain", "info@dailygrain.example"], ["Cedar House", "reservations@cedarhouse.example"],
  ["Market & Vine", "team@marketandvine.example"], ["Golden Hour Cafe", "hello@goldenhourcafe.example"],
  ["Riverside Social", "contact@riversidesocial.example"], ["Common Ground", "info@commonground.example"],
] as const;

function slugify(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "").replace(/(^-|-$)/g, ""); }

/** Replace this adapter with a provider integration later; consumers retain this contract. */
export async function searchLeads({ city, businessType, limit }: LeadSearchInput): Promise<Lead[]> {
  await new Promise((resolve) => setTimeout(resolve, 550));
  const normalizedCity = city.trim();
  const type = businessType.trim() || "Restaurant";
  return Array.from({ length: limit }, (_, index) => {
    const [name, email] = businesses[index % businesses.length];
    const iteration = index >= businesses.length ? ` ${Math.floor(index / businesses.length) + 1}` : "";
    const businessName = `${name}${iteration}`;
    return { id: `${slugify(normalizedCity)}-${slugify(type)}-${index + 1}`, businessName, website: `https://${slugify(businessName)}.example`, email, location: normalizedCity, status: index % 4 === 3 ? "Needs review" : "Ready" };
  });
}
