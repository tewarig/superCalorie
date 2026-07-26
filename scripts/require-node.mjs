/**
 * Fails fast with an actionable message when the wrong Node is in use.
 *
 * Without this, running on Node 20 dies with "--experimental-sqlite is not
 * allowed in NODE_OPTIONS", which blames the flag rather than the runtime
 * and sends you looking in the wrong place.
 */
const MINIMUM = [22, 5, 0];

const current = process.versions.node.split(".").map(Number);

// Compare segment by segment, only looking at a segment when every earlier
// one is an exact tie (22.12.x beats 22.5.0 on minor; 24.x wins on major).
const isTooOld = MINIMUM.some((min, index) => {
  const tiedSoFar = MINIMUM.slice(0, index).every((m, i) => current[i] === m);
  return tiedSoFar && current[index] < min;
});

if (isTooOld) {
  const required = MINIMUM.join(".");
  process.stderr.write(
    `\n  superCalorie needs Node >= ${required} — you are on ${process.versions.node}.\n` +
      `  node:sqlite (the backend's database driver) does not exist on older versions.\n\n` +
      `  Fix: run \`nvm use\` in the repo root (an .nvmrc is checked in),\n` +
      `       or \`nvm install 22\` if you don't have it yet.\n\n`,
  );
  process.exit(1);
}
