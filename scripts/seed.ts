import { getPayload } from 'payload'
import config from '../src/payload.config'

const subjects = [
  { name: 'Travel', slug: 'travel' },
  { name: 'Fashion', slug: 'fashion' },
  { name: 'Portrait Photography', slug: 'portrait-photography' },
  { name: 'Retro', slug: 'retro' },
  { name: 'Comic', slug: 'comic' },
  { name: 'Painterly', slug: 'painterly' },
]

const tools = [
  { name: 'ChatGPT', slug: 'chatgpt', vendor: 'OpenAI', supportsReferenceImage: true, supportsChains: true },
  { name: 'Nano Banana', slug: 'nano-banana', vendor: 'Google', supportsReferenceImage: true, supportsChains: false },
  { name: 'Seedream', slug: 'seedream', vendor: 'ByteDance', supportsReferenceImage: false, supportsChains: false },
  { name: 'Flux', slug: 'flux', vendor: 'Black Forest Labs', supportsReferenceImage: false, supportsChains: false },
  { name: 'Midjourney', slug: 'midjourney', vendor: 'Midjourney Inc.', supportsReferenceImage: false, supportsChains: false },
]

async function seed() {
  const payload = await getPayload({ config })

  for (const subject of subjects) {
    const existing = await payload.find({
      collection: 'subjects',
      where: { slug: { equals: subject.slug } },
    })
    if (existing.totalDocs === 0) {
      await payload.create({ collection: 'subjects', data: subject })
      console.log(`created subject: ${subject.name}`)
    }
  }

  for (const tool of tools) {
    const existing = await payload.find({
      collection: 'tools',
      where: { slug: { equals: tool.slug } },
    })
    if (existing.totalDocs === 0) {
      await payload.create({ collection: 'tools', data: tool })
      console.log(`created tool: ${tool.name}`)
    }
  }

  console.log('seed complete')
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
