import { describe, expect, it } from 'vitest'
import { sanitizeRichText } from '@/lib/sanitize'

describe('sanitizeRichText', () => {
  it('keeps basic formatting', () => {
    expect(sanitizeRichText('<h2>Title</h2><p>Some <strong>bold</strong> and <em>italic</em></p><ul><li>a</li></ul>')).toBe(
      '<h2>Title</h2><p>Some <strong>bold</strong> and <em>italic</em></p><ul><li>a</li></ul>',
    )
  })

  it('removes scripts, event handlers and iframes', () => {
    const dirty = '<p onclick="steal()">Hi</p><script>alert(1)</script><iframe src="https://evil.example"></iframe>'
    expect(sanitizeRichText(dirty)).toBe('<p>Hi</p>')
  })

  it('drops javascript: hrefs but keeps safe links and adds rel', () => {
    expect(sanitizeRichText('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript')
    const safe = sanitizeRichText('<a href="https://example.com" target="_blank">x</a>')
    expect(safe).toContain('href="https://example.com"')
    expect(safe).toContain('rel="noopener noreferrer nofollow"')
  })

  it('converts b and i to strong and em', () => {
    expect(sanitizeRichText('<p><b>a</b><i>b</i></p>')).toBe('<p><strong>a</strong><em>b</em></p>')
  })

  it('strips unknown tags but keeps their text', () => {
    expect(sanitizeRichText('<div><span>hello</span></div>')).toBe('hello')
  })
})
