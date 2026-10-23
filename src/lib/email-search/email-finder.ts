import { isIP } from "node:net";
import { supabaseAdmin } from "@/lib/supabase/supabaseAdmin";
import { isValidEmail } from "@/lib/email-search/email-validation";

export type EmailFinderResult = {
  email: string | null;
};

export type FindAndSaveEmailsInput = {
  limit: number;
  restaurantIds?: string[];
};

export type SavedEmailResult = {
  id: string;
  name: string;
  address: string | null;
  website: string;
  email: string | null;
};

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const CONTACT_PATHS = [
  "/contact",
  "/contact-us",
  "/contacto",
  "/contactanos",
  "/kontakt",
  "/impressum",
  "/legal",
  "/legal-notice",
  "/aviso-legal",
];

function isSafeUrl(value: string): boolean {
  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return false;
    }

    if (url.username || url.password) {
      return false;
    }

    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");

    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      return false;
    }

    const ipVersion = isIP(hostname);

    if (ipVersion === 4) {
      const octets = hostname.split(".").map(Number);
      const [a, b] = octets;

      if (
        a === 0 ||
        a === 10 ||
        a === 127 ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 198 && (b === 18 || b === 19)) ||
        a >= 224
      ) {
        return false;
      }
    }

    // Reject IPv6 literals for this initial safeguard.
    // This avoids accidentally allowing private IPv6 destinations.
    if (ipVersion === 6) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function findAndSaveEmails({
  limit,
  restaurantIds,
}: FindAndSaveEmailsInput): Promise<SavedEmailResult[]> {
  const query = supabaseAdmin
    .from("restaurants")
    .select("id, name,address, website, email")
    .not("website", "is", null)
    .is("email", null)
    .eq("email_checked", false);

  if (restaurantIds?.length) {
    query.in("id", restaurantIds);
  }

  const { data: restaurants, error: fetchError } = await query.limit(limit);

  if (fetchError) {
    throw fetchError;
  }

  const results = (
    await Promise.all(
      (restaurants ?? [])
        .filter((restaurant) => restaurant.website)
        .map(async (restaurant) => {
          try {
            const { email } = await findEmailFromWebsite(restaurant.website!);

            const { error: updateError } = await supabaseAdmin
              .from("restaurants")
              .update({
                email,
                email_checked: true,
              })
              .eq("id", restaurant.id);

            if (updateError) {
              console.error(
                `Failed to save email result for restaurant ${restaurant.id}:`,
                updateError,
              );
              return null;
            }

            return {
              id: restaurant.id,
              name: restaurant.name,
              address: restaurant.address,
              website: restaurant.website!,
              email,
            };
          } catch (error) {
            console.error(
              `Email finder failed for restaurant ${restaurant.id}:`,
              error,
            );
            return null;
          }
        }),
    )
  ).filter((result): result is SavedEmailResult => result !== null);

  return results;
}

export async function findEmailFromWebsite(
  website: string,
): Promise<EmailFinderResult> {
  if (!isSafeUrl(website)) {
    return { email: null };
  }

  const baseUrl = new URL(website);

  const urls = [
    baseUrl.toString(),
    ...CONTACT_PATHS.map((path) => new URL(path, baseUrl.origin).toString()),
  ];

  for (const url of urls) {
    const email = await findEmailFromPage(url);

    if (email) {
      return { email };
    }
  }

  return { email: null };
}

export async function findEmailFromPage(url: string): Promise<string | null> {
  let currentUrl = url;

  for (let redirects = 0; redirects <= 3; redirects++) {
    if (!isSafeUrl(currentUrl)) {
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(currentUrl, {
        headers: {
          "User-Agent": "LeadFinder/1.0",
        },
        cache: "no-store",
        signal: controller.signal,
        redirect: "manual",
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");

        if (!location || redirects === 3) {
          return null;
        }

        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }

      if (!response.ok) {
        return null;
      }

      const html = await response.text();
      const matches = html.match(EMAIL_REGEX);

      return matches?.find(isValidEmail) ?? null;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  return null;
}
