import { describe, expect, it } from "vitest";
import { POST as login } from "@/app/api/auth/login/route";
import { POST as logout } from "@/app/api/auth/logout/route";
import { GET as me, PATCH as updateGoal } from "@/app/api/auth/me/route";
import { POST as signup } from "@/app/api/auth/signup/route";
import { cookieJar } from "./cookie-jar";
import { createAccount, getRequest, jsonRequest } from "./helpers";

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
    await createAccount("bye@example.com");
    expect((await me(getRequest("/api/auth/me"))).status).toBe(200);

    const response = await logout();
    expect(response.status).toBe(200);
    expect((await me(getRequest("/api/auth/me"))).status).toBe(401);
  });
});

describe("/api/auth/me", () => {
  it("resolves the caller from a bearer token", async () => {
    const { token, user } = await createAccount("me@example.com");
    const response = await me(getRequest("/api/auth/me", token));

    expect(response.status).toBe(200);
    expect((await response.json()).user.id).toBe(user.id);
  });

  it("falls back to the session cookie signup set, when no bearer token is sent", async () => {
    const { user } = await createAccount("cookie@example.com");
    const response = await me(getRequest("/api/auth/me"));

    expect(response.status).toBe(200);
    expect((await response.json()).user.id).toBe(user.id);
  });

  it("401s with no credentials at all", async () => {
    await createAccount("me2@example.com");
    cookieJar.reset(); // as if from a browser that never logged in

    expect((await me(getRequest("/api/auth/me"))).status).toBe(401);
  });

  it("401s on a token whose signature does not verify", async () => {
    const { token } = await createAccount("me3@example.com");
    cookieJar.reset();

    const [payload] = token.split(".");
    // The payload still base64-decodes to a real, unexpired user id — only
    // the HMAC is wrong, so this catches a missing signature check.
    expect((await me(getRequest("/api/auth/me", `${payload}.deadbeef`))).status).toBe(401);
    expect((await me(getRequest("/api/auth/me", "garbage"))).status).toBe(401);
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
});
