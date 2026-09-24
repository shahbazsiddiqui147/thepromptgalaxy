import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from '@/lib/password'

describe('password hashing', () => {
  it('verifies the correct password', async () => {
    const hash = await hashPassword('correct horse battery staple')
    expect(hash.startsWith('scrypt$')).toBe(true)
    expect(await verifyPassword('correct horse battery staple', hash)).toBe(true)
  })

  it('rejects a wrong password', async () => {
    const hash = await hashPassword('correct horse battery staple')
    expect(await verifyPassword('wrong password here', hash)).toBe(false)
  })

  it('produces a different hash each time (random salt)', async () => {
    const a = await hashPassword('same password value')
    const b = await hashPassword('same password value')
    expect(a).not.toBe(b)
  })

  it('returns false for a malformed stored hash', async () => {
    expect(await verifyPassword('anything', 'not-a-hash')).toBe(false)
  })
})
