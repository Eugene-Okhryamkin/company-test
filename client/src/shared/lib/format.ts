/** Integer with regular spaces as thousand separators: 12345678 → "12 345 678". */
export function formatNumber(value: number): string {
  const rounded = Math.round(value)
  const sign = rounded < 0 ? '-' : ''
  const digits = String(Math.abs(rounded)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return sign + digits
}

/** Budget as required by the spec: "12 345 678 руб." */
export const formatRub = (value: number): string => `${formatNumber(value)} руб.`

/** Performance with one decimal and a Russian decimal comma: 63.476 → "63,5". */
export const formatPerformance = (value: number): string => value.toFixed(1).replace('.', ',')
