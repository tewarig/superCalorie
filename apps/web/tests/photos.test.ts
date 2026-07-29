import { describe, expect, it } from "vitest";
import { POST as logEntry } from "@/app/api/entries/route";
import { GET as getPhoto } from "@/app/api/photos/[id]/route";
import { POST as uploadPhoto } from "@/app/api/photos/route";
import { MAX_PHOTO_BYTES } from "@/lib/photo-store";
import { call, createAccount, jsonRequest } from "./helpers";

const ORIGIN = "http://localhost:3000";

/** A one-pixel PNG — real bytes, so the round trip is meaningful. */
const PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  ),
  (char) => char.charCodeAt(0),
);

function uploadRequest(
  bytes: Uint8Array,
  type: string,
  token?: string,
  field = "photo",
): Request {
  const form = new FormData();
  form.append(field, new File([bytes as BlobPart], "meal.png", { type }));

  const headers = new Headers();
  if (token) headers.set("authorization", `Bearer ${token}`);
  return new Request(`${ORIGIN}/api/photos`, { method: "POST", headers, body: form });
}

async function upload(bytes: Uint8Array, type: string, token: string) {
  return call(uploadPhoto, uploadRequest(bytes, type, token));
}

describe("POST /api/photos", () => {
  it("stores an image and returns an id", async () => {
    const { token } = await createAccount("photo@example.com");
    const response = await upload(PNG, "image/png", token);

    expect(response.status).toBe(201);
    expect((await response.json()).photoId).toBeTypeOf("string");
  });

  it("401s without credentials", async () => {
    const response = await call(uploadPhoto, uploadRequest(PNG, "image/png"));
    expect(response.status).toBe(401);
  });

  it("rejects a body that isn't multipart form data", async () => {
    const { token } = await createAccount("notform@example.com");
    const response = await call(
      uploadPhoto,
      jsonRequest("POST", "/api/photos", { not: "a form" }, token),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/multipart/i);
  });

  it("rejects a form with no photo field", async () => {
    const { token } = await createAccount("nofield@example.com");
    const response = await call(uploadPhoto, uploadRequest(PNG, "image/png", token, "wrong"));

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/no photo/i);
  });

  it("rejects a type that isn't an image we serve", async () => {
    const { token } = await createAccount("badtype@example.com");
    const response = await upload(PNG, "application/pdf", token);

    expect(response.status).toBe(415);
  });

  it("rejects an empty file", async () => {
    const { token } = await createAccount("empty@example.com");
    const response = await upload(new Uint8Array(0), "image/png", token);

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/empty/i);
  });

  it("rejects anything over the size cap", async () => {
    const { token } = await createAccount("huge@example.com");
    const response = await upload(new Uint8Array(MAX_PHOTO_BYTES + 1), "image/png", token);

    expect(response.status).toBe(413);
  });
});

describe("GET /api/photos/:id", () => {
  async function photoRequest(id: string, token?: string) {
    const headers = new Headers();
    if (token) headers.set("authorization", `Bearer ${token}`);
    return call(getPhoto, new Request(`${ORIGIN}/api/photos/${id}`, { headers }), {
      params: Promise.resolve({ id }),
    });
  }

  it("returns the exact bytes that were uploaded", async () => {
    const { token } = await createAccount("roundtrip@example.com");
    const { photoId } = await (await upload(PNG, "image/png", token)).json();

    const response = await photoRequest(photoId, token);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");

    const returned = new Uint8Array(await response.arrayBuffer());
    expect(returned).toEqual(PNG);
  });

  it("marks the response private so a shared cache can't serve one user's meal to another", async () => {
    const { token } = await createAccount("cache@example.com");
    const { photoId } = await (await upload(PNG, "image/png", token)).json();

    const cacheControl = (await photoRequest(photoId, token)).headers.get("cache-control");
    expect(cacheControl).toContain("private");
  });

  it("401s without credentials", async () => {
    const { token } = await createAccount("anon@example.com");
    const { photoId } = await (await upload(PNG, "image/png", token)).json();

    expect((await photoRequest(photoId)).status).toBe(401);
  });

  it("404s for another account's photo, rather than 403", async () => {
    const { token } = await createAccount("owner@example.com");
    const { photoId } = await (await upload(PNG, "image/png", token)).json();
    const other = await createAccount("intruder@example.com");

    // 404 and not 403: a 403 would confirm the id exists, turning this into
    // an oracle for probing which photos are real.
    expect((await photoRequest(photoId, other.token)).status).toBe(404);
  });

  it("404s for an id that never existed", async () => {
    const { token } = await createAccount("missing@example.com");
    expect((await photoRequest("no-such-photo", token)).status).toBe(404);
  });
});

describe("attaching a photo to an entry", () => {
  it("links the photo when logging", async () => {
    const { token } = await createAccount("attach@example.com");
    const { photoId } = await (await upload(PNG, "image/png", token)).json();

    const response = await call(
      logEntry,
      jsonRequest(
        "POST",
        "/api/entries",
        { name: "Dinner", calories: 500, meal: "dinner", date: "2026-07-29", photoId },
        token,
      ),
    );

    expect(response.status).toBe(201);
    expect((await response.json()).entry.photoId).toBe(photoId);
  });

  it("refuses a photo belonging to someone else", async () => {
    const owner = await createAccount("pown@example.com");
    const { photoId } = await (await upload(PNG, "image/png", owner.token)).json();
    const other = await createAccount("pother@example.com");

    const response = await call(
      logEntry,
      jsonRequest(
        "POST",
        "/api/entries",
        { name: "Dinner", calories: 500, meal: "dinner", date: "2026-07-29", photoId },
        other.token,
      ),
    );

    expect(response.status).toBe(404);
  });

  it("logs without a photo when none is given", async () => {
    const { token } = await createAccount("nophoto@example.com");
    const response = await call(
      logEntry,
      jsonRequest(
        "POST",
        "/api/entries",
        { name: "Dinner", calories: 500, meal: "dinner", date: "2026-07-29" },
        token,
      ),
    );

    expect((await response.json()).entry.photoId).toBeNull();
  });
});
