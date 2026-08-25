type EmailFinderResult = {
  email: string | null;
};

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export async function findEmailFromWebsite(
  website: string,
): Promise<EmailFinderResult> {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, 8000);

  try {
    const response = await fetch(website, {
      headers: {
        "User-Agent": "LeadFinder/1.0",
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      return { email: null };
    }

    const html = await response.text();

    const matches = html.match(EMAIL_REGEX);

    if (!matches) {
      return { email: null };
    }

    const email = matches.find((value) => {
      const normalizedEmail = value.toLowerCase();

      return (
        !normalizedEmail.includes("example.com") &&
        !normalizedEmail.includes("domain.com") &&
        !normalizedEmail.includes("sentry")
      );
    });

    return {
      email: email ?? null,
    };
  } catch {
    return { email: null };
  } finally {
    clearTimeout(timeout);
  }
}
