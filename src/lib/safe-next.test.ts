import { describe, expect, it } from 'vitest'
import { safeNextPath } from '@/lib/safe-next'

describe('safeNextPath', () => {
  it('keeps same-site paths', () => {
    expect(safeNextPath('/admin/categories/')).toBe('/admin/categories/')
  })
  it('falls back for empty, absolute, protocol-relative and backslash paths', () => {
    expect(safeNextPath('')).toBe('/admin/')
    expect(safeNextPath('https://evil.example/')).toBe('/admin/')
    expect(safeNextPath('//evil.example/')).toBe('/admin/')
    expect(safeNextPath('/\\evil.example')).toBe('/admin/')
  })
})
