/**
 * Pairing codes are 6 characters; show them as two groups of three
 * ("ABC DEF") so they're easy to read aloud. Longer legacy codes pass through.
 */
export function formatPairingCodeForDisplay(code: string) {
  return code.length === 6 ? `${code.slice(0, 3)} ${code.slice(3)}` : code;
}
