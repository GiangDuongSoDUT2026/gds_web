/**
 * Lightweight nanoid-like ID generator without external dependency.
 */
export function nanoid(size = 21): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const randomValues = crypto.getRandomValues(new Uint8Array(size));
  for (let i = 0; i < size; i++) {
    result += chars[randomValues[i] % chars.length];
  }
  return result;
}
