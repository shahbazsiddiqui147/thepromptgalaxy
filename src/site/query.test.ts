import { describe, expect, it } from 'vitest'
import { buildHref, parseHubQuery } from '@/site/query'

describe('parseHubQuery', () => {
  it('reads valid values', () => {
    expect(parseHubQuery({ tool: 'midjourney', style: 'cinematic', fit: 'great', price: 'free', sort: 'newest', page: '3' })).toEqual({
      tool: 'midjourney', category: undefined, style: 'cinematic', fit: true, price: 'free', sort: 'newest', page: 3,
    })
  })
  it('ignores invalid values and uses defaults', () => {
    expect(parseHubQuery({ tool: 'Bad Slug!', price: 'x', sort: 'y', page: '-2', fit: 'no' })).toEqual({
      tool: undefined, category: undefined, style: undefined, fit: false, price: undefined, sort: 'saved', page: 1,
    })
    expect(parseHubQuery({ page: 'abc' }).page).toBe(1)
    expect(parseHubQuery({ page: '99999' }).page).toBe(500)
  })
  it('takes the first value of a repeated parameter', () => {
    expect(parseHubQuery({ tool: ['a', 'b'] }).tool).toBe('a')
  })
})

describe('buildHref', () => {
  it('leaves out empty values and keeps the path', () => {
    expect(buildHref('/category/x/', { tool: 'mj', style: undefined, fit: false, page: 1 })).toBe('/category/x/?tool=mj&page=1')
    expect(buildHref('/category/x/', {})).toBe('/category/x/')
    expect(buildHref('/tool/y/', { fit: true })).toBe('/tool/y/?fit=great')
  })
})
