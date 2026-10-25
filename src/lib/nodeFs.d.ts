// Only the tests read files from disk (the app has no @types/node); this is the one call they use.
declare module 'node:fs/promises' {
  export function readFile(path: URL): Promise<Uint8Array>
}
