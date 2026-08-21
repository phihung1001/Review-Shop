import { describe, expect, it } from 'vitest'
import { getPayoutBank, PAYOUT_BANKS, PAYOUT_BANK_OPTIONS } from './payoutBanks.js'

describe('Payout bank catalog', () => {
  it('maps a selected bank code to the bank name sent to the backend', () => {
    expect(getPayoutBank(' vcb ')).toEqual({ code: 'VCB', name: 'Vietcombank' })
  })

  it('contains unique codes and matching Select options', () => {
    expect(new Set(PAYOUT_BANKS.map((bank) => bank.code)).size).toBe(PAYOUT_BANKS.length)
    expect(PAYOUT_BANK_OPTIONS).toHaveLength(PAYOUT_BANKS.length)
  })
})
