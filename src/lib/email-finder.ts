type EmailFinderResult = {
  email: string | null;
};

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const CONTACT_PATHS = ["/contact", "/kontakt", "/impressum"];

export async function findEmailFromWebsite(
  website: string,
): Promise<EmailFinderResult> {
  let baseUrl: URL;

  try {
    baseUrl = new URL(website);
  } catch {
    return { email: null };
  }

  const urls = [
    baseUrl.toString(),
    ...CONTACT_PATHS.map(
      (path) => new URL(path, baseUrl.origin).toString(),
    ),
  ];

  for (const url of urls) {
    const email = await findEmailFromPage(url);

    if (email) {
      return { email };
    }
  }

  return { email: null };
}

async function findEmailFromPage(url: string): Promise<string | null> {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 8000);

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "LeadFinder/1.0",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();
    const matches = html.match(EMAIL_REGEX);

    if (!matches) {
      return null;
    }

    return (
      matches.find((value) => {
        const normalizedEmail = value.toLowerCase();

        return (
          !normalizedEmail.includes("example.com") &&
          !normalizedEmail.includes("domain.com") &&
          !normalizedEmail.includes("sentry")
        );
      }) ?? null
    );
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}