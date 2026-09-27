/**
 * Font size for an amount inside a fixed-size coin, so "1250 kr" still fits
 * on one line: the base size for up to `fits` characters, then smaller.
 */
export function amountFontSize(
  amount: number | string,
  base: number,
  fits = 3,
) {
  const length = String(amount).replace("-", "−").length;
  if (length <= fits) return base;
  return Math.max(10, Math.round(base * (fits / length) * 1.08));
}
