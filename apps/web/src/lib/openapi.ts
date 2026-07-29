/**
 * The OpenAPI description of this backend.
 *
 * Hand-written rather than generated, because Next.js route handlers carry
 * no schema metadata to generate from. The risk with a hand-written spec is
 * drift, so `tests/openapi.test.ts` asserts that every route on disk appears
 * here with matching methods, and that nothing here is fictional.
 *
 * Versioning: `info.version` is the contract's version, independent of the
 * app's. Bump the minor for additions, the major for anything that would
 * break an existing integration.
 */

export const API_VERSION = "0.4.0";

const error = {
  type: "object",
  properties: { error: { type: "string" } },
  required: ["error"],
} as const;

function jsonResponse(description: string, schema: unknown) {
  return { description, content: { "application/json": { schema } } };
}

function ref(name: string) {
  return { $ref: `#/components/schemas/${name}` };
}

const errorResponses = {
  "400": jsonResponse("The request was malformed.", error),
  "401": jsonResponse("Missing or invalid credentials.", error),
  "404": jsonResponse("No such resource for this account.", error),
};

export const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "superCalorie API",
    version: API_VERSION,
    summary: "Calorie and macro tracking, with a food library and meal photos.",
    description: [
      "A small HTTP API for storing food logs.",
      "",
      "The apps are local-first and work with no account at all — this API is for",
      "syncing between devices, backing up, and letting other tools build on your",
      "data. Anything you store here can be pulled back out in one request via",
      "`GET /api/export`, in the same document format the apps use locally.",
      "",
      "**Authentication.** Every endpoint except `/api/health` needs a session.",
      "Call `/api/auth/signup` or `/api/auth/login`, then either send the returned",
      "token as `Authorization: Bearer <token>` or let the `sc_session` cookie ride",
      "along. Integrations should prefer the bearer token.",
      "",
      "**Units.** Calories are kcal and macros are grams, both integers. Dates are",
      "`YYYY-MM-DD` in the user's local timezone — the client decides what day a",
      "meal belongs to, so a late dinner isn't pushed into tomorrow by UTC.",
    ].join("\n"),
    license: { name: "MIT" },
  },
  servers: [
    { url: "http://localhost:3000", description: "Local development" },
    { url: "https://{host}", description: "Self-hosted", variables: { host: { default: "example.com" } } },
  ],
  tags: [
    { name: "Health", description: "Liveness." },
    { name: "Auth", description: "Accounts and sessions." },
    { name: "Foods", description: "The food library and external nutrition sources." },
    { name: "Entries", description: "Logged food." },
    { name: "Photos", description: "Meal images." },
    { name: "Portability", description: "Bulk export and import." },
    { name: "Profile", description: "The shareable public page." },
    { name: "Meta", description: "The API's own description." },
  ],
  security: [{ bearerAuth: [] }, { cookieAuth: [] }],
  paths: {
    "/api/health": {
      get: {
        tags: ["Health"],
        summary: "Liveness check",
        security: [],
        responses: {
          "200": jsonResponse("The service is up.", {
            type: "object",
            properties: { ok: { type: "boolean" }, service: { type: "string" } },
          }),
        },
      },
    },

    "/api/openapi.json": {
      get: {
        tags: ["Meta"],
        summary: "This specification",
        description:
          "Unauthenticated on purpose — a contract you need credentials to read is no use for generating a client. A rendered version lives at `/api-docs`.",
        security: [],
        responses: {
          "200": jsonResponse("The OpenAPI document.", { type: "object" }),
        },
      },
    },

    "/api/auth/signup": {
      post: {
        tags: ["Auth"],
        summary: "Create an account",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email" },
                  password: { type: "string", minLength: 8 },
                  name: { type: "string", description: "Defaults to the email's local part." },
                },
                required: ["email", "password"],
              },
            },
          },
        },
        responses: {
          "201": jsonResponse("Account created and signed in.", ref("AuthResult")),
          "400": errorResponses["400"],
          "409": jsonResponse("That email already has an account.", error),
        },
      },
    },

    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Sign in",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: { email: { type: "string" }, password: { type: "string" } },
                required: ["email", "password"],
              },
            },
          },
        },
        responses: {
          "200": jsonResponse("Signed in.", ref("AuthResult")),
          "401": jsonResponse(
            "Wrong password, or no such account — deliberately the same message, so this cannot be used to discover which emails are registered.",
            error,
          ),
        },
      },
    },

    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Clear the session cookie",
        description:
          "Only clears the cookie. A bearer token stays valid until it expires, so a client holding one should discard it.",
        responses: {
          "200": jsonResponse("Signed out.", {
            type: "object",
            properties: { ok: { type: "boolean" } },
          }),
        },
      },
    },

    "/api/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "The current account",
        responses: {
          "200": jsonResponse("The signed-in user.", {
            type: "object",
            properties: { user: ref("User") },
          }),
          "401": errorResponses["401"],
        },
      },
      patch: {
        tags: ["Auth"],
        summary: "Update the daily calorie goal",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  dailyCalorieGoal: { type: "integer", minimum: 800, maximum: 10000 },
                  macroSplit: ref("MacroSplit"),
                },
                // Neither is required on its own, but a body with neither is
                // rejected — a typo in a field name should not look like a
                // successful no-op.
                minProperties: 1,
              },
            },
          },
        },
        responses: {
          "200": jsonResponse("Updated.", { type: "object", properties: { user: ref("User") } }),
          "400": errorResponses["400"],
          "401": errorResponses["401"],
        },
      },
    },

    "/api/foods": {
      get: {
        tags: ["Foods"],
        summary: "Search foods",
        description: [
          "With `q`, searches a curated library first, then USDA FoodData Central",
          "for generic whole foods and Open Food Facts for packaged products.",
          "Remote results are cached on first sight, so a food is fetched once.",
          "",
          "Without `q`, returns this account's most-logged foods.",
          "",
          "Check `degraded` before trusting the list to be complete: it names any",
          "upstream that was unreachable, and the response is still 200 because a",
          "partial list beats an error.",
        ].join("\n"),
        parameters: [
          {
            name: "q",
            in: "query",
            required: false,
            schema: { type: "string" },
            example: "paneer",
          },
        ],
        responses: {
          "200": jsonResponse("Matching foods.", {
            type: "object",
            properties: {
              foods: { type: "array", items: ref("Food") },
              source: { type: "string", enum: ["search", "recent"] },
              degraded: {
                type: "array",
                items: { type: "string", enum: ["usda", "off"] },
                description: "Upstreams that failed or timed out.",
              },
            },
          }),
          "401": errorResponses["401"],
        },
      },
    },

    "/api/entries": {
      get: {
        tags: ["Entries"],
        summary: "One day of logging, or everything changed since a time",
        description:
          "With `since`, returns entries written at or after that moment plus tombstones for anything deleted, for a client catching up. The window is inclusive: timestamps are millisecond resolution, and skipping the boundary would lose entries permanently, whereas re-sending it is harmless because clients merge by id. `since` takes precedence over `date`.",
        parameters: [
          {
            name: "date",
            in: "query",
            required: false,
            schema: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
            description: "Defaults to the server's today. Send yours to avoid timezone drift.",
            example: "2026-07-26",
          },
          {
            name: "since",
            in: "query",
            required: false,
            schema: { type: "string", format: "date-time" },
            description:
              "Sync watermark. Use the `syncedAt` from the previous response rather than your own clock.",
            example: "2026-07-26T18:00:00.000Z",
          },
        ],
        responses: {
          "200": jsonResponse("The day, with totals — or the changes since `since`.", {
            oneOf: [ref("DaySummary"), ref("SyncChanges")],
          }),
          "400": errorResponses["400"],
          "401": errorResponses["401"],
        },
      },
      post: {
        tags: ["Entries"],
        summary: "Log food",
        description:
          "Either reference a library food by `foodId` — its macros are scaled by `quantity` — or supply `name` and `calories` for a one-off entry. Macros are copied onto the entry at log time, so later corrections to a food never rewrite history.",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  foodId: { type: "string" },
                  quantity: { type: "number", minimum: 0, maximum: 50, default: 1 },
                  name: { type: "string", description: "For a custom entry." },
                  calories: { type: "integer", minimum: 0, maximum: 10000 },
                  protein: { type: "integer", minimum: 0 },
                  carbs: { type: "integer", minimum: 0 },
                  fat: { type: "integer", minimum: 0 },
                  meal: ref("MealType"),
                  date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
                  photoId: { type: "string", description: "From POST /api/photos." },
                },
                required: ["meal"],
              },
            },
          },
        },
        responses: {
          "201": jsonResponse("Logged.", { type: "object", properties: { entry: ref("FoodEntry") } }),
          "400": errorResponses["400"],
          "401": errorResponses["401"],
          "404": jsonResponse("No such food or photo on this account.", error),
        },
      },
    },

    "/api/entries/{id}": {
      delete: {
        tags: ["Entries"],
        summary: "Remove an entry",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": jsonResponse("Removed.", {
            type: "object",
            properties: { ok: { type: "boolean" } },
          }),
          "401": errorResponses["401"],
          "404": jsonResponse("Not found, or not yours.", error),
        },
      },
    },

    "/api/photos": {
      post: {
        tags: ["Photos"],
        summary: "Upload a meal photo",
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: { photo: { type: "string", format: "binary" } },
                required: ["photo"],
              },
            },
          },
        },
        responses: {
          "201": jsonResponse("Stored.", {
            type: "object",
            properties: { photoId: { type: "string" } },
          }),
          "400": errorResponses["400"],
          "401": errorResponses["401"],
          "413": jsonResponse("Larger than 8 MB.", error),
          "415": jsonResponse("Not a JPEG, PNG, WebP, or HEIC.", error),
        },
      },
    },

    "/api/photos/{id}": {
      get: {
        tags: ["Photos"],
        summary: "Fetch a photo",
        description:
          "Scoped to the owner. Someone else's id is a 404 rather than a 403, so this cannot be used to probe which ids exist.",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "The image bytes.",
            content: {
              "image/jpeg": { schema: { type: "string", format: "binary" } },
              "image/png": { schema: { type: "string", format: "binary" } },
              "image/webp": { schema: { type: "string", format: "binary" } },
            },
          },
          "401": errorResponses["401"],
          "404": errorResponses["404"],
          "410": jsonResponse("Recorded, but the file is gone.", error),
        },
      },
    },

    "/api/profile": {
      get: {
        tags: ["Profile"],
        summary: "Your own profile",
        description: "Includes sections that are switched off, since this is the owner's view.",
        responses: {
          "200": jsonResponse("The profile, or null if none is claimed.", {
            type: "object",
            properties: { profile: { oneOf: [ref("Profile"), { type: "null" }] } },
          }),
          "401": errorResponses["401"],
        },
      },
      put: {
        tags: ["Profile"],
        summary: "Claim a handle and choose what to publish",
        description: [
          "Every visibility flag defaults to false, including on update — omitting",
          "one switches it off rather than leaving it as it was. A client that",
          "forgets a field therefore publishes less, never more.",
          "",
          "A new profile publishes nothing: claiming a name and sharing a food",
          "diary are separate decisions.",
        ].join("\n"),
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  handle: { type: "string", pattern: "^[a-z0-9][a-z0-9_-]{1,28}[a-z0-9]$" },
                  displayName: { type: "string", maxLength: 60 },
                  bio: { type: "string", maxLength: 280 },
                  avatarPhotoId: {
                    type: "string",
                    description: "Must be a photo this account uploaded.",
                  },
                  isPublic: { type: "boolean", default: false },
                  showToday: { type: "boolean", default: false },
                  showTotals: { type: "boolean", default: false },
                  showTopFoods: { type: "boolean", default: false },
                  showHeatmap: { type: "boolean", default: false },
                  showRecent: { type: "boolean", default: false },
                },
                required: ["handle"],
              },
            },
          },
        },
        responses: {
          "200": jsonResponse("Saved.", {
            type: "object",
            properties: { profile: ref("Profile") },
          }),
          "400": errorResponses["400"],
          "401": errorResponses["401"],
          "404": jsonResponse("The avatar photo does not belong to this account.", error),
          "409": jsonResponse("Another account holds that handle.", error),
        },
      },
      delete: {
        tags: ["Profile"],
        summary: "Release the handle and take the page down",
        responses: {
          "200": jsonResponse("Removed.", {
            type: "object",
            properties: { ok: { type: "boolean" } },
          }),
          "401": errorResponses["401"],
        },
      },
    },

    "/api/public/{handle}": {
      get: {
        tags: ["Profile"],
        summary: "A public profile",
        description: [
          "Unauthenticated — this is the shareable page.",
          "",
          "Only sections the owner enabled are present, and a hidden section is",
          "absent rather than null, so its existence cannot be inferred. A",
          "profile that is not public returns 404, identical to an unclaimed",
          "handle, so account existence cannot be probed.",
        ].join("\n"),
        security: [],
        parameters: [{ name: "handle", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": jsonResponse("The profile as the world sees it.", ref("PublicProfile")),
          "404": jsonResponse("No public profile at that handle.", error),
        },
      },
    },

    "/api/public/{handle}/avatar": {
      get: {
        tags: ["Profile"],
        summary: "A public profile's avatar",
        description:
          "Separate from /api/photos/:id, which stays owner-scoped. Meal photos are private; only the chosen avatar is readable, and only while the profile is public.",
        security: [],
        parameters: [{ name: "handle", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": {
            description: "The image bytes.",
            content: { "image/jpeg": { schema: { type: "string", format: "binary" } } },
          },
          "404": jsonResponse("No public avatar.", error),
          "410": jsonResponse("Recorded, but the file is gone.", error),
        },
      },
    },

    "/api/export": {
      get: {
        tags: ["Portability"],
        summary: "Export everything",
        description:
          "The whole account as one document, in the same shape the apps store locally — so a server export imports straight into a device.",
        responses: {
          "200": jsonResponse("The full snapshot.", ref("Snapshot")),
          "401": errorResponses["401"],
        },
      },
    },

    "/api/import": {
      post: {
        tags: ["Portability"],
        summary: "Import a snapshot",
        description:
          "Additive and idempotent — entries are matched on id, so re-sending the same document adds nothing and overwrites nothing. Photo bytes do not travel in a snapshot.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: ref("Snapshot") } },
        },
        responses: {
          "200": jsonResponse("Merged.", {
            type: "object",
            properties: {
              added: { type: "integer" },
              skipped: { type: "integer", description: "Already present." },
            },
          }),
          "400": errorResponses["400"],
          "401": errorResponses["401"],
        },
      },
    },
  },

  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        description: "The `token` from signup or login. Preferred for integrations.",
      },
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "sc_session",
        description: "Set automatically by signup and login; used by the web app.",
      },
    },
    schemas: {
      MealType: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] },
      User: {
        type: "object",
        properties: {
          id: { type: "string" },
          email: { type: "string", format: "email" },
          name: { type: "string" },
          dailyCalorieGoal: { type: "integer" },
          macroSplit: ref("MacroSplit"),
          createdAt: { type: "string", format: "date-time" },
        },
      },
      SyncChanges: {
        type: "object",
        description: "Everything that changed since a watermark.",
        properties: {
          since: { type: "string", format: "date-time" },
          entries: { type: "array", items: ref("FoodEntry") },
          deletions: { type: "array", items: ref("Deletion") },
          syncedAt: {
            type: "string",
            format: "date-time",
            description: "Watermark for the next call, from the server's clock rather than yours.",
          },
        },
        required: ["since", "entries", "deletions", "syncedAt"],
      },
      Deletion: {
        type: "object",
        description:
          "A tombstone. Kept after the entry is gone so a device still holding it does not re-upload it and undo the delete.",
        properties: {
          id: { type: "string", description: "The id of the entry that was deleted." },
          deletedAt: { type: "string", format: "date-time" },
        },
        required: ["id", "deletedAt"],
      },
      MacroSplit: {
        type: "object",
        description:
          "How the calorie goal divides between macronutrients, as whole percentages. Always totals exactly 100; a body that does not is rejected rather than rescaled. Grams are derived at 4, 4 and 9 kcal per gram.",
        properties: {
          protein: { type: "integer", minimum: 0, maximum: 100 },
          carbs: { type: "integer", minimum: 0, maximum: 100 },
          fat: { type: "integer", minimum: 0, maximum: 100 },
        },
        required: ["protein", "carbs", "fat"],
      },
      AuthResult: {
        type: "object",
        properties: {
          user: ref("User"),
          token: { type: "string", description: "Bearer token, valid 30 days." },
        },
      },
      Food: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          servingLabel: { type: "string", examples: ["1 roti", "100 g"] },
          calories: { type: "integer" },
          protein: { type: "integer" },
          carbs: { type: "integer" },
          fat: { type: "integer" },
          source: {
            type: "string",
            enum: ["library", "usda", "off"],
            description:
              "Where the numbers came from — `usda` is lab-analysed, `off` is a product label, `library` is a curated estimate. They are not equally trustworthy.",
          },
          brand: { type: "string" },
        },
      },
      FoodEntry: {
        type: "object",
        properties: {
          id: { type: "string" },
          foodId: { type: ["string", "null"] },
          name: { type: "string" },
          quantity: { type: "number" },
          servingLabel: { type: "string" },
          calories: { type: "integer" },
          protein: { type: "integer" },
          carbs: { type: "integer" },
          fat: { type: "integer" },
          meal: ref("MealType"),
          date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          createdAt: { type: "string", format: "date-time" },
          photoId: { type: ["string", "null"] },
        },
      },
      Totals: {
        type: "object",
        properties: {
          calories: { type: "integer" },
          protein: { type: "integer" },
          carbs: { type: "integer" },
          fat: { type: "integer" },
        },
      },
      DaySummary: {
        type: "object",
        properties: {
          date: { type: "string" },
          entries: { type: "array", items: ref("FoodEntry") },
          totals: ref("Totals"),
          goal: { type: "integer" },
          remaining: { type: "integer", description: "Never negative; 0 once over." },
        },
      },
      Snapshot: {
        type: "object",
        properties: {
          version: { type: "integer", enum: [1] },
          profile: {
            type: "object",
            properties: { name: { type: "string" }, dailyCalorieGoal: { type: "integer" } },
          },
          entries: { type: "array", items: ref("FoodEntry") },
          customFoods: { type: "array", items: ref("Food") },
        },
        required: ["version", "entries"],
      },
      Profile: {
        type: "object",
        description: "The owner's view, including sections that are switched off.",
        properties: {
          handle: { type: "string" },
          displayName: { type: "string" },
          bio: { type: ["string", "null"] },
          avatarPhotoId: { type: ["string", "null"] },
          createdAt: { type: "string", format: "date-time" },
          isPublic: { type: "boolean" },
          showToday: { type: "boolean" },
          showTotals: { type: "boolean" },
          showTopFoods: { type: "boolean" },
          showHeatmap: { type: "boolean" },
          showRecent: { type: "boolean" },
        },
      },
      PublicProfile: {
        type: "object",
        properties: {
          handle: { type: "string" },
          displayName: { type: "string" },
          bio: { type: ["string", "null"] },
          avatarPhotoId: { type: ["string", "null"] },
          joinedAt: { type: "string", format: "date-time" },
          stats: {
            type: "object",
            description: "Only the enabled sections appear.",
            properties: {
              today: {
                type: "object",
                properties: { calories: { type: "integer" }, goal: { type: "integer" } },
              },
              totals: {
                type: "object",
                properties: {
                  days: { type: "integer" },
                  entries: { type: "integer" },
                  calories: { type: "integer" },
                  currentStreak: { type: "integer" },
                },
              },
              topFoods: { type: "array", items: ref("TopFood") },
              heatmap: { type: "array", items: ref("HeatmapDay") },
              recent: { type: "array", items: ref("RecentItem") },
            },
          },
        },
      },
      TopFood: {
        type: "object",
        properties: {
          name: { type: "string" },
          count: { type: "integer" },
          calories: { type: "integer" },
        },
      },
      HeatmapDay: {
        type: "object",
        properties: {
          date: { type: "string" },
          calories: { type: "integer" },
          level: {
            type: "integer",
            minimum: 0,
            maximum: 4,
            description: "0 = nothing logged; 1–4 are quarters of that person's own goal.",
          },
        },
      },
      RecentItem: {
        type: "object",
        properties: {
          date: { type: "string" },
          name: { type: "string" },
          calories: { type: "integer" },
          meal: ref("MealType"),
        },
      },
      Error: error,
    },
  },
} as const;
