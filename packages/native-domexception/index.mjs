/**
 * Drop-in for deprecated `node-domexception` (used by fetch-blob / node-fetch).
 * Node 18+ provides DOMException globally; this repo targets Node >= 20.
 */
const DOMException = globalThis.DOMException;
if (!DOMException) {
  throw new Error(
    "globalThis.DOMException is missing; use Node 18+ (this project requires Node 20+).",
  );
}
export default DOMException;
