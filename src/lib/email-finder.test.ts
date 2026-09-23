import { isValidEmail } from "./email-finder";

describe("isValidEmail", () => {
  it("accepts a normal restaurant email", () => {
    expect(isValidEmail("info@restaurant.de")).toBe(true);
  });
});