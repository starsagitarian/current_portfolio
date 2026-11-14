import { describe, expect, it } from "vitest";
import { fieldErrorsFromDetail, validate } from "./contact";

const ok = { name: "Ada", email: "ada@example.com", message: "Hello" };

describe("validate", () => {
  it("accepts a complete message", () => {
    expect(validate(ok)).toEqual({});
    expect(validate({ ...ok, email: "  ada.l+cv@mail.example.co.uk  " })).toEqual({});
  });

  it("names each missing or malformed field", () => {
    expect(validate({ name: " ", email: "", message: "\n" })).toEqual({
      name: expect.stringContaining("name") as string,
      email: expect.stringContaining("email") as string,
      message: expect.stringContaining("message") as string,
    });
    for (const email of ["ada", "ada@", "ada@example", "a..b@example.com", "ada@@example.com"]) {
      expect(validate({ ...ok, email }).email, email).toBeDefined();
    }
  });

  it("holds the API's limits", () => {
    expect(validate({ ...ok, name: "x".repeat(101) }).name).toBeDefined();
    expect(validate({ ...ok, message: "x".repeat(5001) }).message).toBeDefined();
    expect(validate({ ...ok, message: "東".repeat(5000) })).toEqual({});
  });
});

describe("fieldErrorsFromDetail", () => {
  it("reads which fields the API refused", () => {
    expect(
      Object.keys(fieldErrorsFromDetail("Invalid request body. email: Invalid email address.")),
    ).toEqual(["email"]);
    expect(
      Object.keys(
        fieldErrorsFromDetail("Invalid request body. name: Too big; message: Too small."),
      ),
    ).toEqual(["name", "message"]);
    expect(fieldErrorsFromDetail("Something else")).toEqual({});
  });
});
