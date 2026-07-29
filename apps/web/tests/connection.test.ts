import { describe, expect, it } from "vitest";
import { LOCAL_ONLY, baseUrlFor, serverUrlError } from "@supercalorie/core";

describe("resolving which server to call", () => {
  it("calls nobody in local mode", () => {
    expect(baseUrlFor(LOCAL_ONLY)).toBe("");
  });

  it("uses same-origin for the hosted instance", () => {
    // An empty base keeps fetches relative, which is what makes the web app
    // work unchanged whether it's on localhost or a deployed domain.
    expect(baseUrlFor({ mode: "hosted", serverUrl: "" })).toBe("");
    expect(baseUrlFor({ mode: "hosted", serverUrl: "" }, "https://app.example")).toBe(
      "https://app.example",
    );
  });

  it("uses the configured origin when self-hosted", () => {
    expect(baseUrlFor({ mode: "self-hosted", serverUrl: "https://mine.example" })).toBe(
      "https://mine.example",
    );
  });

  it("strips trailing slashes so paths don't double up", () => {
    // Otherwise every request would go to https://mine.example//api/entries.
    expect(baseUrlFor({ mode: "self-hosted", serverUrl: "https://mine.example///" })).toBe(
      "https://mine.example",
    );
  });
});

describe("validating a self-hosted address", () => {
  it.each(["https://mine.example", "https://mine.example:8443/base", "http://localhost:3000"])(
    "accepts %s",
    (url) => {
      expect(serverUrlError(url)).toBeNull();
    },
  );

  it.each([
    ["", /Enter the address/],
    ["   ", /Enter the address/],
    ["mine.example", /valid URL/],
    ["ftp://mine.example", /http/],
    ["javascript:alert(1)", /http/],
  ])("rejects %s", (url, message) => {
    expect(serverUrlError(url)).toMatch(message);
  });

  it("allows plain http only for loopback", () => {
    expect(serverUrlError("http://127.0.0.1:3000")).toBeNull();
    // Sending a password over plaintext to a remote host is worth refusing
    // outright rather than warning about.
    expect(serverUrlError("http://mine.example")).toMatch(/https/);
  });
});
