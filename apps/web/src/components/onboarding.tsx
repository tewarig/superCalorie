"use client";

import { serverUrlError, type Connection } from "@supercalorie/core";
import { useState } from "react";

/**
 * The first-run choice.
 *
 * Local is listed first and needs no input, because it is the honest default
 * — the app is fully functional without an account, and asking someone to
 * sign up before they can log a banana is the thing this app is trying not
 * to be. The other two exist for syncing across devices and publishing a
 * profile, which genuinely need a server.
 */
export function Onboarding({ onChoose }: { onChoose: (connection: Connection) => void }) {
  const [showSelfHosted, setShowSelfHosted] = useState(false);
  const [serverUrl, setServerUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function connectSelfHosted() {
    const problem = serverUrlError(serverUrl);
    if (problem) {
      setError(problem);
      return;
    }
    onChoose({ mode: "self-hosted", serverUrl: serverUrl.trim() });
  }

  return (
    <div className="grain flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg">
        <h1 className="font-display text-4xl font-semibold text-ink">
          super<span className="text-tangerine">Calorie</span>
        </h1>
        <p className="mt-3 text-ink-soft">How would you like to use it?</p>

        <div className="mt-8 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => onChoose({ mode: "local", serverUrl: "" })}
            className="rounded-2xl border border-sand bg-white p-5 text-left transition-colors hover:border-leaf"
          >
            <p className="font-display text-lg font-semibold text-ink">
              Just start logging
              <span className="ml-2 rounded-full bg-mint px-2 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-leaf-deep">
                No account
              </span>
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              Everything stays on this device and works offline. Export any time as JSON or CSV.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onChoose({ mode: "hosted", serverUrl: "" })}
            className="rounded-2xl border border-sand bg-white p-5 text-left transition-colors hover:border-leaf"
          >
            <p className="font-display text-lg font-semibold text-ink">Use this instance</p>
            <p className="mt-1 text-sm text-ink-soft">
              Sign in to sync between devices and publish a shareable profile. Your log is stored
              on whichever server this app is running on.
            </p>
          </button>

          {showSelfHosted ? (
            <div className="rounded-2xl border border-leaf bg-white p-5">
              <p className="font-display text-lg font-semibold text-ink">Your own server</p>
              <p className="mt-1 text-sm text-ink-soft">
                Point the app at a backend you run yourself.
              </p>
              <input
                value={serverUrl}
                onChange={(event) => {
                  setServerUrl(event.target.value);
                  setError(null);
                }}
                onKeyDown={(event) => event.key === "Enter" && connectSelfHosted()}
                placeholder="https://calories.example.com"
                className="mt-3 w-full rounded-xl border border-sand bg-cream px-4 py-2.5 text-ink outline-none placeholder:text-ink-faint focus:border-leaf"
              />
              {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
              <button
                type="button"
                onClick={connectSelfHosted}
                className="mt-3 rounded-full bg-leaf px-5 py-2 text-sm font-semibold text-cream transition-colors hover:bg-leaf-deep"
              >
                Connect
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowSelfHosted(true)}
              className="rounded-2xl border border-dashed border-sand bg-transparent p-5 text-left transition-colors hover:border-ink"
            >
              <p className="font-display text-lg font-semibold text-ink">I self-host</p>
              <p className="mt-1 text-sm text-ink-soft">
                Point the app at your own backend instead.
              </p>
            </button>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-ink-faint">
          You can change this later, and nothing is published until you say so.
        </p>
      </div>
    </div>
  );
}
