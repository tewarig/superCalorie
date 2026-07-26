import { createApiClient } from "@supercalorie/core";

/** Same-origin client — the browser sends the session cookie automatically. */
export const api = createApiClient();
