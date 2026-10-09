
export function isValidEmail(email: string): boolean {
  const normalizedEmail = email.toLowerCase().trim();

  const invalidPatterns = [
    "example.com",
    "example.org",
    "domain.com",
    "ejemplo.com",
    "beispielpostfach.de",
    "sentry",
  ];

  if (
    invalidPatterns.some((pattern) =>
      normalizedEmail.includes(pattern)
    )
  ) {
    return false;
  }

  if (normalizedEmail.length > 254) {
    return false;
  }

  const domain = normalizedEmail.split("@")[1];

  if (!domain) {
    return false;
  }

  const tld = domain.split(".").pop();

  if (!tld || tld.length < 2) {
    return false;
  }

  const suspiciousTlds = ["png", "jpg", "jpeg", "gif", "svg", "webp"];

  if (suspiciousTlds.includes(tld)) {
    return false;
  }

  return true;
}

