export function isValidEmail(email: string): boolean {
  const normalizedEmail = email.toLowerCase().trim();

  if (
    normalizedEmail.includes("example.com") ||
    normalizedEmail.includes("domain.com") ||
    normalizedEmail.includes("sentry")
  ) {
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