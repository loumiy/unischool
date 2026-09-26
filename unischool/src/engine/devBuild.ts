// Whether this is a development build (Plan 70C). Vite replaces
// import.meta.env in the browser bundle, so the public build reads false.
// Headless callers (the harness and the tests, bundled for Node) have no
// import.meta.env and count as development, where the playtest actions live.
// The cast keeps this compiling under the Node configs, which do not load
// Vite's types.
const env = (import.meta as ImportMeta & { env?: { DEV?: boolean } }).env;
export const DEV_BUILD: boolean = typeof env === 'object' && env !== null ? env.DEV === true : true;
