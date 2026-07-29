import { DEFAULT_MACRO_SPLIT } from "@supercalorie/core";
import { describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as me, PATCH as updateGoal } from "@/app/api/auth/me/route";
import { POST as signup } from "@/app/api/auth/signup/route";
import { call, cookiesFrom, createAccount, getRequest, jsonRequest } from "./helpers";

describe("POST /api/auth/signup", () => {
  it("creates an account and returns a token, never the password hash", async () => {
    const response = await signup(
      jsonRequest("POST", "/api/auth/signup", {
        email: "sam@example.com",
        password: "password123",
        name: "Sam",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.user.email).toBe("sam@example.com");
    expect(body.user.dailyCalorieGoal).toBe(2000);
    expect(body.token).toBeTypeOf("string");
    expect(body.user).not.toHaveProperty("passwordHash");
    expect(body.user).not.toHaveProperty("salt");
  });

  it("normalises the email and defaults the name to its local part", async () => {
    const response = await signup(
      jsonRequest("POST", "/api/auth/signup", {
        email: "  MiXeD@Example.COM  ",
        password: "password123",
      }),
    );
    const { user } = await response.json();

    expect(user.email).toBe("mixed@example.com");
    expect(user.name).toBe("mixed");
  });

  it.each([
    ["not-an-email", "password123", 400],
    ["ok@example.com", "short", 400],
  ])("rejects email=%s password=%s", async (email, password, status) => {
    const response = await signup(jsonRequest("POST", "/api/auth/signup", { email, password }));
    expect(response.status).toBe(status);
    expect((await response.json()).error).toBeTypeOf("string");
  });

  it("rejects a duplicate email regardless of casing", async () => {
    await createAccount("dupe@example.com");
    const response = await signup(
      jsonRequest("POST", "/api/auth/signup", {
        email: "DUPE@example.com",
        password: "password123",
      }),
    );
    expect(response.status).toBe(409);
  });
});

describe("POST /api/auth/login", () => {
  it("issues a token for the right password", async () => {
    await createAccount("li@example.com", "password123");
    const response = await login(
      jsonRequest("POST", "/api/auth/login", { email: "li@example.com", password: "password123" }),
    );

    expect(response.status).toBe(200);
    expect((await response.json()).token).toBeTypeOf("string");
  });

  it("rejects a wrong password and an unknown user with the same 401", async () => {
    await createAccount("li2@example.com", "password123");

    const wrongPassword = await login(
      jsonRequest("POST", "/api/auth/login", { email: "li2@example.com", password: "nope12345" }),
    );
    const unknownUser = await login(
      jsonRequest("POST", "/api/auth/login", { email: "ghost@example.com", password: "password123" }),
    );

    expect(wrongPassword.status).toBe(401);
    expect(unknownUser.status).toBe(401);
    // Identical message — no account-existence oracle.
    expect((await wrongPassword.json()).error).toBe((await unknownUser.json()).error);
  });
});

describe("POST /api/auth/logout", () => {
  it("clears the session cookie", async () => {
    const { cookie } = await createAccount("bye@example.com");
    // The cookie signup issued really does authenticate, before we clear it.
    expect((await call(me, getRequest("/api/auth/me", undefined, cookie))).status).toBe(200);

    const response = await call(logout, jsonRequest("POST", "/api/auth/logout", undefined, undefined, cookie));
    expect(response.status).toBe(200);

    // Replaying exactly what logout told the client to store leaves it anonymous.
    const cleared = cookiesFrom(response);
    expect((await call(me, getRequest("/api/auth/me", undefined, cleared))).status).toBe(401);
  });
});

describe("/api/auth/me", () => {
  it("resolves the caller from a bearer token", async () => {
    const { token, user } = await createAccount("me@example.com");
    const response = await me(getRequest("/api/auth/me", token));

    expect(response.status).toBe(200);
    expect((await response.json()).user.id).toBe(user.id);
  });

  it("falls back to the session cookie when no bearer token is sent", async () => {
    const { user, cookie } = await createAccount("cookie@example.com");
    const response = await call(me, getRequest("/api/auth/me", undefined, cookie));

    expect(response.status).toBe(200);
    expect((await response.json()).user.id).toBe(user.id);
  });

  it("401s with no credentials at all", async () => {
    // An account exists; this request simply carries nothing that proves it.
    await createAccount("me2@example.com");

    expect((await call(me, getRequest("/api/auth/me"))).status).toBe(401);
  });

  it("401s on a token whose signature does not verify", async () => {
    const { token } = await createAccount("me3@example.com");

    const [payload] = token.split(".");
    // The payload still base64-decodes to a real, unexpired user id — only
    // the HMAC is wrong, so this catches a missing signature check.
    expect((await me(getRequest("/api/auth/me", `${payload}.deadbeef`))).status).toBe(401);
    expect((await me(getRequest("/api/auth/me", "garbage"))).status).toBe(401);
  });

  it("does not fall back to a valid cookie when the bearer token is bad", async () => {
    const { cookie } = await createAccount("both@example.com");
    // That cookie alone would authenticate; presenting a broken bearer token
    // alongside it must still fail, rather than quietly downgrading to the
    // cookie and honouring a request the caller got wrong.
    const response = await call(me, getRequest("/api/auth/me", "not-a-real-token", cookie));

    expect(response.status).toBe(401);
  });

  it("updates the calorie goal and clamps out-of-range values", async () => {
    const { token } = await createAccount("goal@example.com");

    const ok = await updateGoal(jsonRequest("PATCH", "/api/auth/me", { dailyCalorieGoal: 2400 }, token));
    expect(ok.status).toBe(200);
    expect((await ok.json()).user.dailyCalorieGoal).toBe(2400);

    for (const goal of [500, 20000, "abc"]) {
      const bad = await updateGoal(
        jsonRequest("PATCH", "/api/auth/me", { dailyCalorieGoal: goal }, token),
      );
      expect(bad.status, `goal ${goal} should be rejected`).toBe(400);
    }

    // The rejected writes left the accepted value alone.
    const after = await me(getRequest("/api/auth/me", token));
    expect((await after.json()).user.dailyCalorieGoal).toBe(2400);
  });

  it("starts every account on the balanced split", async () => {
    const { token } = await createAccount("split-default@example.com");
    const response = await me(getRequest("/api/auth/me", token));

    expect((await response.json()).user.macroSplit).toEqual(DEFAULT_MACRO_SPLIT);
  });

  it("updates the macro split", async () => {
    const { token } = await createAccount("split@example.com");
    const split = { protein: 40, carbs: 30, fat: 30 };

    const ok = await updateGoal(jsonRequest("PATCH", "/api/auth/me", { macroSplit: split }, token));

    expect(ok.status).toBe(200);
    expect((await ok.json()).user.macroSplit).toEqual(split);
  });

  it("updates the goal and the split in one request", async () => {
    const { token } = await createAccount("goal-and-split@example.com");

    const ok = await updateGoal(
      jsonRequest(
        "PATCH",
        "/api/auth/me",
        { dailyCalorieGoal: 2600, macroSplit: { protein: 20, carbs: 55, fat: 25 } },
        token,
      ),
    );

    const { user } = await ok.json();
    expect(user.dailyCalorieGoal).toBe(2600);
    expect(user.macroSplit).toEqual({ protein: 20, carbs: 55, fat: 25 });
  });

  it.each([
    ["a total that is not 100", { protein: 50, carbs: 30, fat: 30 }, /total 100, not 110/],
    ["a fractional percentage", { protein: 33.3, carbs: 36.7, fat: 30 }, /whole number/],
    ["a negative percentage", { protein: -10, carbs: 60, fat: 50 }, /between 0 and 100/],
    ["a missing macro", { protein: 50, carbs: 50 }, /macroSplit.fat/],
    ["a string", "40/30/30", /must be an object/],
    ["null", null, /must be an object/],
  ])("rejects %s", async (label, macroSplit, message) => {
    const { token } = await createAccount(`bad-${label.replace(/\W/g, "")}@example.com`);

    const response = await updateGoal(
      jsonRequest("PATCH", "/api/auth/me", { macroSplit }, token),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(message);
  });

  it("leaves the stored split untouched when the new one is rejected", async () => {
    const { token } = await createAccount("split-atomic@example.com");
    await updateGoal(
      jsonRequest("PATCH", "/api/auth/me", { macroSplit: { protein: 40, carbs: 30, fat: 30 } }, token),
    );

    // Goal is valid, split is not. Neither may be written, or the caller is
    // told the request failed while half of it took effect.
    const response = await updateGoal(
      jsonRequest(
        "PATCH",
        "/api/auth/me",
        { dailyCalorieGoal: 2900, macroSplit: { protein: 1, carbs: 1, fat: 1 } },
        token,
      ),
    );
    expect(response.status).toBe(400);

    const { user } = await (await me(getRequest("/api/auth/me", token))).json();
    expect(user.macroSplit).toEqual({ protein: 40, carbs: 30, fat: 30 });
    expect(user.dailyCalorieGoal).toBe(2000);
  });

  it("reports a body that asks for nothing, rather than accepting a typo", async () => {
    const { token } = await createAccount("empty-patch@example.com");

    const response = await updateGoal(
      // `dailyCalorieGaol` — a real typo would otherwise look like success.
      jsonRequest("PATCH", "/api/auth/me", { dailyCalorieGaol: 2400 }, token),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).error).toMatch(/dailyCalorieGoal, macroSplit, or both/);
  });

  it("falls back to the balanced split when the stored JSON is unreadable", async () => {
    const { token } = await createAccount("corrupt-split@example.com");
    const { getDb } = await import("@/lib/db");

    // What a hand-edited database, or a column written by some future client,
    // could realistically contain. It must not crash the endpoint or hand
    // back a split that does not total 100.
    getDb().prepare("UPDATE users SET macro_split = ? WHERE email = ?")
      .run("not json at all", "corrupt-split@example.com");

    const response = await me(getRequest("/api/auth/me", token));

    expect(response.status).toBe(200);
    expect((await response.json()).user.macroSplit).toEqual(DEFAULT_MACRO_SPLIT);
  });

  it("refuses an unauthenticated update", async () => {
    const response = await updateGoal(
      jsonRequest("PATCH", "/api/auth/me", { dailyCalorieGoal: 2400 }),
    );
    expect(response.status).toBe(401);
  });
});
