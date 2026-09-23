import { isValidEmail } from "./email-validation";

describe("isValidEmail", () => {
  it("accepts a normal restaurant email", () => {
    expect(isValidEmail("info@restaurant.de")).toBe(true);
  });
});