import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { API_VERSION, openApiDocument } from "@/lib/openapi";

/**
 * A hand-written spec drifts from the code the moment someone adds a route
 * and forgets. These tests make that drift a failure rather than a lie
 * published to anyone building an integration.
 */

const API_ROOT = join(process.cwd(), "src/app/api");

/** Walks the route tree, returning "/api/path" → the methods it exports. */
function routesOnDisk(dir = API_ROOT, prefix = "/api"): Map<string, Set<string>> {
  const found = new Map<string, Set<string>>();

  for (const name of readdirSync(dir)) {
    const full = join(dir, name);

    if (statSync(full).isDirectory()) {
      // [id] in the filesystem is {id} in OpenAPI.
      const segment = name.startsWith("[") ? `{${name.slice(1, -1)}}` : name;
      for (const [path, methods] of routesOnDisk(full, `${prefix}/${segment}`)) {
        found.set(path, methods);
      }
    } else if (name === "route.ts") {
      const source = readFileSync(full, "utf8");
      const methods = [...source.matchAll(/export async function (GET|POST|PATCH|PUT|DELETE)/g)].map(
        (match) => match[1].toLowerCase(),
      );
      if (methods.length > 0) found.set(prefix, new Set(methods));
    }
  }
  return found;
}

const disk = routesOnDisk();
const spec = openApiDocument.paths as Record<string, Record<string, unknown>>;

describe("the spec matches the routes that actually exist", () => {
  it("finds the routes to compare against", () => {
    // Guards the walker itself — a silent empty result would make every
    // other assertion below pass vacuously.
    expect(disk.size).toBeGreaterThan(8);
    expect([...disk.keys()]).toContain("/api/entries");
  });

  it.each([...disk.keys()].sort())("documents %s", (path) => {
    expect(spec[path], `${path} exists but is missing from the spec`).toBeDefined();
  });

  it.each([...disk.entries()].sort())("documents every method on %s", (path, methods) => {
    const documented = new Set(
      Object.keys(spec[path] ?? {}).filter((key) =>
        ["get", "post", "patch", "put", "delete"].includes(key),
      ),
    );
    expect([...methods].sort()).toEqual([...documented].sort());
  });

  it("describes no route that doesn't exist", () => {
    const invented = Object.keys(spec).filter((path) => !disk.has(path));
    expect(invented).toEqual([]);
  });
});

describe("the document is usable by tooling", () => {
  it("is OpenAPI 3.1 with a semver version", () => {
    expect(openApiDocument.openapi).toBe("3.1.0");
    expect(API_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(openApiDocument.info.version).toBe(API_VERSION);
  });

  it("resolves every $ref it uses", () => {
    const schemas = new Set(Object.keys(openApiDocument.components.schemas));
    const refs = [...JSON.stringify(openApiDocument).matchAll(/#\/components\/schemas\/(\w+)/g)].map(
      (match) => match[1],
    );

    expect(refs.length).toBeGreaterThan(0);
    for (const name of new Set(refs)) {
      expect(schemas.has(name), `$ref to missing schema ${name}`).toBe(true);
    }
  });

  it("gives every operation a tag, a summary, and a 200-or-201", () => {
    for (const [path, operations] of Object.entries(spec)) {
      for (const [method, operation] of Object.entries(operations)) {
        const op = operation as {
          tags?: string[];
          summary?: string;
          responses?: Record<string, unknown>;
        };
        const where = `${method.toUpperCase()} ${path}`;

        expect(op.summary, `${where} has no summary`).toBeTruthy();
        expect(op.tags?.length, `${where} has no tag`).toBeGreaterThan(0);
        expect(
          Object.keys(op.responses ?? {}).some((code) => code === "200" || code === "201"),
          `${where} documents no success response`,
        ).toBe(true);
      }
    }
  });

  it("declares every tag it uses", () => {
    // `as const` on the document narrows tag names to a literal union, which
    // won't accept the plain strings pulled out of operations.
    const declared = new Set<string>(openApiDocument.tags.map((tag) => tag.name));
    for (const operations of Object.values(spec)) {
      for (const operation of Object.values(operations)) {
        for (const tag of (operation as { tags?: string[] }).tags ?? []) {
          expect(declared.has(tag), `undeclared tag ${tag}`).toBe(true);
        }
      }
    }
  });

  it("requires auth everywhere except the endpoints meant to be public", () => {
    const publicOperations: string[] = [];
    for (const [path, operations] of Object.entries(spec)) {
      for (const [method, operation] of Object.entries(operations)) {
        const security = (operation as { security?: unknown[] }).security;
        if (Array.isArray(security) && security.length === 0) {
          publicOperations.push(`${method.toUpperCase()} ${path}`);
        }
      }
    }

    // Anything else being reachable without credentials is a real finding,
    // not a documentation nit. The two public-profile routes are here on
    // purpose — a shareable page that needs a login is not shareable — and
    // they only ever return what an owner explicitly switched on.
    expect(publicOperations.sort()).toEqual([
      "GET /api/health",
      "GET /api/openapi.json",
      "GET /api/public/{handle}",
      "GET /api/public/{handle}/avatar",
      "POST /api/auth/login",
      "POST /api/auth/signup",
    ]);
  });

  it("serialises to JSON, since that's how it's served", () => {
    expect(() => JSON.parse(JSON.stringify(openApiDocument))).not.toThrow();
  });
});
