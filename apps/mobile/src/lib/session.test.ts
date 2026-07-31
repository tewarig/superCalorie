import { ApiError } from "@supercalorie/core";

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("./local-store", () => ({
  getConnection: jest.fn(),
}));

jest.mock("@supercalorie/core", () => {
  const actual = jest.requireActual("@supercalorie/core");
  return {
    ...actual,
    createApiClient: jest.fn(),
  };
});

/**
 * session.ts memoizes its state at module scope (`restoring`, `session`), so
 * each test needs its own fresh module instance rather than the singleton
 * carrying state over between cases. The mocks it depends on must come from
 * that same isolated registry, or assertions would inspect a different
 * instance than the one session.ts actually called.
 */
function loadSession(meResult: { user?: unknown } | Error) {
  let result!: { session: typeof import("./session"); secureStore: typeof import("expo-secure-store") };
  jest.isolateModules(() => {
    const secureStore = require("expo-secure-store");
    const { getConnection } = require("./local-store");
    const { createApiClient } = require("@supercalorie/core");

    secureStore.getItemAsync.mockResolvedValue("stored-token");
    getConnection.mockReturnValue({ mode: "hosted", serverUrl: "" });
    createApiClient.mockReturnValue({
      me:
        meResult instanceof Error
          ? jest.fn().mockRejectedValue(meResult)
          : jest.fn().mockResolvedValue(meResult),
    });

    result = { session: require("./session"), secureStore };
  });
  return result;
}

describe("restoreSession", () => {
  it("keeps the token on a network failure so a later launch can retry it", async () => {
    const { session, secureStore } = loadSession(new TypeError("Network request failed"));
    await session.restoreSession();

    expect(session.getSession()).toBeNull();
    expect(secureStore.deleteItemAsync).not.toHaveBeenCalled();
  });

  it("discards the token when the server rejects it as unauthorized", async () => {
    const { session, secureStore } = loadSession(new ApiError("Unauthorized", 401));
    await session.restoreSession();

    expect(session.getSession()).toBeNull();
    expect(secureStore.deleteItemAsync).toHaveBeenCalledWith("supercalorie.session.token");
  });

  it("adopts the session when the token checks out", async () => {
    const user = { id: "u1", email: "a@b.com", name: "A", dailyCalorieGoal: 2000 };
    const { session, secureStore } = loadSession({ user });
    await session.restoreSession();

    expect(session.getSession()).toEqual({ token: "stored-token", user });
    expect(secureStore.deleteItemAsync).not.toHaveBeenCalled();
  });
});
