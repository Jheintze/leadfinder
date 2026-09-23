import { isValidEmail } from "./email-validation";

describe("isValidEmail", () => {
  it("accepts a normal restaurant email", () => {
    expect(isValidEmail("info@restaurant.de")).toBe(true);
  });

  it("accepts a Gmail address", () => {
    expect(isValidEmail("restaurant@gmail.com")).toBe(true);
  });

  it("accepts a Mexican restaurant email", () => {
    expect(isValidEmail("reservas@restaurant.mx")).toBe(true);
  });

  it("rejects an image file address", () => {
    expect(isValidEmail("icon@192.png")).toBe(false);
  });

  it("rejects example.com addresses", () => {
    expect(isValidEmail("contact@example.com")).toBe(false);
  });

  it("rejects domain.com addresses", () => {
    expect(isValidEmail("usuario@domain.com")).toBe(false);
  });

  it("rejects Sentry addresses", () => {
    expect(isValidEmail("error@sentry.io")).toBe(false);
  });
});