import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { ImageError, MAX_UPLOAD_BYTES, processImage } from '@/media/process'

async function png(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: '#ff0000' } }).png().toBuffer()
}

describe('processImage', () => {
  it('re-encodes a PNG and produces card (800px) and thumb (400px) webp variants', async () => {
    const result = await processImage(await png(1200, 600))
    expect(result).toMatchObject({ ext: 'png', mime: 'image/png', width: 1200, height: 600 })
    expect((await sharp(result.card).metadata()).width).toBe(800)
    expect((await sharp(result.card).metadata()).format).toBe('webp')
    expect((await sharp(result.thumb).metadata()).width).toBe(400)
  })

  it('never enlarges a small image', async () => {
    const result = await processImage(await png(100, 50))
    expect((await sharp(result.card).metadata()).width).toBe(100)
    expect((await sharp(result.thumb).metadata()).width).toBe(100)
  })

  it('accepts JPEG and WebP', async () => {
    const jpeg = await sharp({ create: { width: 300, height: 300, channels: 3, background: '#00ff00' } }).jpeg().toBuffer()
    const webp = await sharp({ create: { width: 300, height: 300, channels: 3, background: '#0000ff' } }).webp().toBuffer()
    expect((await processImage(jpeg)).ext).toBe('jpg')
    expect((await processImage(webp)).ext).toBe('webp')
  })

  it('rejects text that is not an image', async () => {
    await expect(processImage(Buffer.from('hello world'))).rejects.toBeInstanceOf(ImageError)
  })

  it('rejects SVG because it can carry scripts', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10"/></svg>')
    await expect(processImage(svg)).rejects.toThrow(/JPEG, PNG or WebP/)
  })

  it('rejects an empty file and an oversized file before decoding', async () => {
    await expect(processImage(Buffer.alloc(0))).rejects.toThrow(/empty/)
    await expect(processImage(Buffer.alloc(MAX_UPLOAD_BYTES + 1))).rejects.toThrow(/12 MB/)
  })

  it('rejects an image with a side longer than 8000 px', async () => {
    await expect(processImage(await png(8001, 10))).rejects.toThrow(/8000/)
  })
})
