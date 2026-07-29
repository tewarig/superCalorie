import { rmSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { POST as logEntry } from "@/app/api/entries/route";
import {
  DELETE as deleteProfile,
  GET as getProfile,
  PUT as putProfile,
} from "@/app/api/profile/route";
import { GET as getPublic } from "@/app/api/public/[handle]/route";
import { GET as getAvatar } from "@/app/api/public/[handle]/avatar/route";
import { POST as uploadPhoto } from "@/app/api/photos/route";
import { call, createAccount, getRequest, jsonRequest } from "./helpers";

const ORIGIN = "http://localhost:3000";

const PNG = Uint8Array.from(
  atob(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  ),
  (char) => char.charCodeAt(0),
);

const ALL_SECTIONS = {
  isPublic: true,
  showToday: true,
  showTotals: true,
  showTopFoods: true,
  showHeatmap: true,
  showRecent: true,
};

function saveProfile(body: Record<string, unknown>, token: string) {
  return call(
    putProfile,
    new Request(`${ORIGIN}/api/profile`, {
      method: "PUT",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    }),
  );
}

function readPublic(handle: string) {
  return call(getPublic, getRequest(`/api/public/${handle}`), {
    params: Promise.resolve({ handle }),
  });
}

async function uploadAvatar(token: string): Promise<string> {
  const form = new FormData();
  form.append("photo", new File([PNG as BlobPart], "me.png", { type: "image/png" }));
  const response = await call(
    uploadPhoto,
    new Request(`${ORIGIN}/api/photos`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: form,
    }),
  );
  return (await response.json()).photoId;
}

describe("claiming a handle", () => {
  it("creates a profile that publishes nothing", async () => {
    const { token } = await createAccount("claim@example.com");
    const response = await saveProfile({ handle: "gaurav" }, token);

    expect(response.status).toBe(200);
    const { profile } = await response.json();

    // Claiming a name and publishing a food diary are separate decisions.
    expect(profile).toMatchObject({
      handle: "gaurav",
      isPublic: false,
      showToday: false,
      showTotals: false,
      showTopFoods: false,
      showHeatmap: false,
      showRecent: false,
    });
  });

  it("normalises case so the URL people are given actually resolves", async () => {
    const { token } = await createAccount("case@example.com");
    await saveProfile({ handle: "  GauRav_T  ", ...ALL_SECTIONS }, token);

    expect((await readPublic("gaurav_t")).status).toBe(200);
    expect((await readPublic("GAURAV_T")).status).toBe(200);
  });

  it.each([
    ["ab", 400],
    ["admin", 400],
    ["has spaces", 400],
  ])("rejects %s", async (handle, status) => {
    const { token } = await createAccount(`bad-${handle.replace(/\W/g, "")}@example.com`);
    expect((await saveProfile({ handle }, token)).status).toBe(status);
  });

  it("refuses a handle another account already holds", async () => {
    const first = await createAccount("first@example.com");
    await saveProfile({ handle: "taken" }, first.token);

    const second = await createAccount("second@example.com");
    const response = await saveProfile({ handle: "taken" }, second.token);

    expect(response.status).toBe(409);
  });

  it("lets an account keep its own handle when updating", async () => {
    const { token } = await createAccount("keep@example.com");
    await saveProfile({ handle: "mine" }, token);

    const response = await saveProfile({ handle: "mine", isPublic: true }, token);
    expect(response.status).toBe(200);
  });

  it("401s without credentials", async () => {
    const response = await call(
      putProfile,
      new Request(`${ORIGIN}/api/profile`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ handle: "anon" }),
      }),
    );
    expect(response.status).toBe(401);
  });

  it("survives a malformed body", async () => {
    const { token } = await createAccount("badbody@example.com");
    const response = await call(
      putProfile,
      new Request(`${ORIGIN}/api/profile`, {
        method: "PUT",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: "{ not json",
      }),
    );
    expect(response.status).toBe(400);
  });
});

describe("what the public page reveals", () => {
  async function accountWithHistory(email: string) {
    const account = await createAccount(email);
    for (const date of ["2026-07-28", "2026-07-29"]) {
      await call(
        logEntry,
        jsonRequest(
          "POST",
          "/api/entries",
          { name: "Roti", calories: 104, meal: "dinner", date },
          account.token,
        ),
      );
    }
    return account;
  }

  it("404s a profile that exists but isn't public", async () => {
    const { token } = await accountWithHistory("private@example.com");
    await saveProfile({ handle: "quiet", showTotals: true }, token);

    // Indistinguishable from an unclaimed handle, so nobody can enumerate
    // which accounts exist by probing names.
    expect((await readPublic("quiet")).status).toBe(404);
  });

  it("404s a handle nobody has claimed", async () => {
    expect((await readPublic("nobody-here")).status).toBe(404);
  });

  it("shows only the sections that were switched on", async () => {
    const { token } = await accountWithHistory("partial@example.com");
    await saveProfile({ handle: "partial", isPublic: true, showTotals: true }, token);

    const body = await (await readPublic("partial")).json();

    expect(Object.keys(body.stats)).toEqual(["totals"]);
    expect(body.stats.totals.entries).toBe(2);
  });

  it("publishes everything when everything is enabled", async () => {
    const { token } = await accountWithHistory("open@example.com");
    await saveProfile({ handle: "open", ...ALL_SECTIONS }, token);

    const body = await (await readPublic("open")).json();

    expect(Object.keys(body.stats).sort()).toEqual([
      "heatmap",
      "recent",
      "today",
      "topFoods",
      "totals",
    ]);
    expect(body.stats.heatmap).toHaveLength(365);
    expect(body.stats.topFoods[0].name).toBe("Roti");
  });

  it("never exposes the owner's email or id", async () => {
    const { token } = await accountWithHistory("secret@example.com");
    await saveProfile({ handle: "careful", ...ALL_SECTIONS }, token);

    const raw = await (await readPublic("careful")).text();

    expect(raw).not.toContain("secret@example.com");
    expect(raw).not.toContain("userId");
  });

  it("goes dark again the moment the owner turns it off", async () => {
    const { token } = await accountWithHistory("toggle@example.com");
    await saveProfile({ handle: "toggle", ...ALL_SECTIONS }, token);
    expect((await readPublic("toggle")).status).toBe(200);

    // Omitting the flags is the same as switching them off — a client that
    // forgets a field must not leave data published.
    await saveProfile({ handle: "toggle" }, token);
    expect((await readPublic("toggle")).status).toBe(404);
  });

  it("is never cached, so hiding takes effect at once", async () => {
    const { token } = await accountWithHistory("cache@example.com");
    await saveProfile({ handle: "nocache", ...ALL_SECTIONS }, token);

    const response = await readPublic("nocache");

    // A shared cache holding this even briefly would mean a profile stays
    // readable after its owner made it private — found by hiding a profile
    // in a browser and watching the API keep serving the old 200.
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("takes the page down when the profile is deleted", async () => {
    const { token } = await accountWithHistory("gone@example.com");
    await saveProfile({ handle: "leaving", ...ALL_SECTIONS }, token);

    await call(deleteProfile, new Request(`${ORIGIN}/api/profile`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${token}` },
    }));

    expect((await readPublic("leaving")).status).toBe(404);
  });
});

describe("avatars", () => {
  it("serves the avatar of a public profile", async () => {
    const { token } = await createAccount("avatar@example.com");
    const photoId = await uploadAvatar(token);
    await saveProfile({ handle: "withpic", avatarPhotoId: photoId, ...ALL_SECTIONS }, token);

    const response = await call(getAvatar, getRequest("/api/public/withpic/avatar"), {
      params: Promise.resolve({ handle: "withpic" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
  });

  it("refuses a photo belonging to another account", async () => {
    const owner = await createAccount("photoowner@example.com");
    const photoId = await uploadAvatar(owner.token);

    const other = await createAccount("thief@example.com");
    const response = await saveProfile(
      { handle: "thief", avatarPhotoId: photoId },
      other.token,
    );

    expect(response.status).toBe(404);
  });

  it("404s the avatar while the profile is private", async () => {
    const { token } = await createAccount("hiddenpic@example.com");
    const photoId = await uploadAvatar(token);
    await saveProfile({ handle: "hiddenpic", avatarPhotoId: photoId }, token);

    const response = await call(getAvatar, getRequest("/api/public/hiddenpic/avatar"), {
      params: Promise.resolve({ handle: "hiddenpic" }),
    });
    expect(response.status).toBe(404);
  });

  it("410s when the profile still points at a file that is gone", async () => {
    const { token } = await createAccount("lostpic@example.com");
    const photoId = await uploadAvatar(token);
    await saveProfile({ handle: "lostpic", avatarPhotoId: photoId, ...ALL_SECTIONS }, token);

    // A restore that brought the database back but not the images.
    rmSync(process.env.PHOTO_DIR!, { recursive: true, force: true });

    const response = await call(getAvatar, getRequest("/api/public/lostpic/avatar"), {
      params: Promise.resolve({ handle: "lostpic" }),
    });
    expect(response.status).toBe(410);
  });

  it("404s when a public profile has no avatar", async () => {
    const { token } = await createAccount("noavatar@example.com");
    await saveProfile({ handle: "noavatar", ...ALL_SECTIONS }, token);

    const response = await call(getAvatar, getRequest("/api/public/noavatar/avatar"), {
      params: Promise.resolve({ handle: "noavatar" }),
    });
    expect(response.status).toBe(404);
  });
});

describe("display name and bio", () => {
  it("keeps what was given, trimmed", async () => {
    const { token } = await createAccount("bio@example.com");
    const response = await saveProfile(
      { handle: "withbio", displayName: "  Gaurav T  ", bio: "  Eating well.  " },
      token,
    );

    expect((await response.json()).profile).toMatchObject({
      displayName: "Gaurav T",
      bio: "Eating well.",
    });
  });

  it("falls back to the account name when none is given", async () => {
    const { token } = await createAccount("noname@example.com");
    const response = await saveProfile({ handle: "noname" }, token);

    // createAccount names the user "Test"; a blank display name shouldn't
    // leave a profile page with an empty heading.
    expect((await response.json()).profile.displayName).toBe("Test");
  });

  it("ignores a blank display name rather than storing whitespace", async () => {
    const { token } = await createAccount("blank@example.com");
    const response = await saveProfile({ handle: "blankname", displayName: "   " }, token);

    expect((await response.json()).profile.displayName).toBe("Test");
  });

  it("truncates rather than rejecting an over-long bio", async () => {
    const { token } = await createAccount("longbio@example.com");
    const response = await saveProfile({ handle: "longbio", bio: "x".repeat(400) }, token);

    // Losing the tail beats losing the whole submission.
    expect((await response.json()).profile.bio).toHaveLength(280);
  });

  it("stores an empty bio as null", async () => {
    const { token } = await createAccount("emptybio@example.com");
    const response = await saveProfile({ handle: "emptybio", bio: "   " }, token);

    expect((await response.json()).profile.bio).toBeNull();
  });
});

describe("reading your own profile", () => {
  it("returns null before one is claimed", async () => {
    const { token } = await createAccount("none@example.com");
    const body = await (await call(getProfile, getRequest("/api/profile", token))).json();

    expect(body.profile).toBeNull();
  });

  it("returns the profile including hidden sections", async () => {
    const { token } = await createAccount("own@example.com");
    await saveProfile({ handle: "owner", showTotals: true }, token);

    const body = await (await call(getProfile, getRequest("/api/profile", token))).json();
    // The owner sees their own settings even though nothing is published.
    expect(body.profile).toMatchObject({ handle: "owner", isPublic: false, showTotals: true });
  });

  it.each([
    ["GET", getProfile],
    ["DELETE", deleteProfile],
  ])("401s %s without credentials", async (method, handler) => {
    const response = await call(
      handler,
      new Request(`${ORIGIN}/api/profile`, { method }),
    );
    expect(response.status).toBe(401);
  });
});
