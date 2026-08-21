export const PAYOUT_BANKS = Object.freeze([
  { code: 'VCB', name: 'Vietcombank' },
  { code: 'BIDV', name: 'BIDV' },
  { code: 'ICB', name: 'VietinBank' },
  { code: 'VBA', name: 'Agribank' },
  { code: 'TCB', name: 'Techcombank' },
  { code: 'MB', name: 'MBBank' },
  { code: 'VPB', name: 'VPBank' },
  { code: 'ACB', name: 'ACB' },
  { code: 'VIB', name: 'VIB' },
  { code: 'TPB', name: 'TPBank' },
  { code: 'STB', name: 'Sacombank' },
  { code: 'HDB', name: 'HDBank' },
  { code: 'VCCB', name: 'Viet Capital Bank' },
  { code: 'SHB', name: 'SHB' },
  { code: 'MSB', name: 'MSB' },
  { code: 'OCB', name: 'OCB' },
  { code: 'EIB', name: 'Eximbank' },
  { code: 'LPB', name: 'LPBank' },
  { code: 'SEAB', name: 'SeABank' },
  { code: 'NAB', name: 'Nam A Bank' },
  { code: 'BAB', name: 'Bac A Bank' },
  { code: 'ABB', name: 'ABBank' },
  { code: 'VAB', name: 'VietABank' },
  { code: 'BVB', name: 'BaoViet Bank' },
  { code: 'KLB', name: 'KienlongBank' },
  { code: 'PGB', name: 'PGBank' },
  { code: 'PVCB', name: 'PVcomBank' },
  { code: 'SCB', name: 'SCB' },
  { code: 'SGICB', name: 'Saigonbank' },
  { code: 'NCB', name: 'NCB' },
  { code: 'VIETBANK', name: 'VietBank' },
  { code: 'COOPBANK', name: 'Co-opBank' },
  { code: 'SHBVN', name: 'Shinhan Bank' },
  { code: 'CIMB', name: 'CIMB Bank' },
  { code: 'WVN', name: 'Woori Bank' },
])

export const PAYOUT_BANK_OPTIONS = PAYOUT_BANKS.map(({ code, name }) => ({
  value: code,
  label: `${code} — ${name}`,
}))

export function getPayoutBank(code) {
  const normalizedCode = String(code ?? '').trim().toUpperCase()
  return PAYOUT_BANKS.find((bank) => bank.code === normalizedCode) ?? null
}
