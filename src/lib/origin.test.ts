import { describe, expect, it } from 'vitest'
import { isSameOrigin } from '@/lib/origin'

describe('isSameOrigin', () => {
  it('accepts an origin whose host equals the Host header', () => {
    expect(isSameOrigin('https://thepromptgalaxy.com', 'thepromptgalaxy.com')).toBe(true)
    expect(isSameOrigin('http://localhost:3000', 'localhost:3000')).toBe(true)
  })
  it('rejects a different host or port', () => {
    expect(isSameOrigin('https://evil.example', 'thepromptgalaxy.com')).toBe(false)
    expect(isSameOrigin('http://localhost:3001', 'localhost:3000')).toBe(false)
  })
  it('rejects missing headers and malformed origins', () => {
    expect(isSameOrigin(null, 'thepromptgalaxy.com')).toBe(false)
    expect(isSameOrigin('https://thepromptgalaxy.com', null)).toBe(false)
    expect(isSameOrigin('not a url', 'thepromptgalaxy.com')).toBe(false)
  })
})
