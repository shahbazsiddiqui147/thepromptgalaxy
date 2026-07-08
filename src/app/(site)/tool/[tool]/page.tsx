import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getTools, getToolBySlug, getPromptsByTool } from '@/lib/queries'
import { ArchiveListing } from '@/components/ArchiveListing'

export const revalidate = 3600

export async function generateStaticParams() {
  const tools = await getTools()
  return tools.map((t) => ({ tool: t.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tool: string }>
}): Promise<Metadata> {
  const { tool: toolSlug } = await params
  const tool = await getToolBySlug(toolSlug)
  if (!tool) return {}
  return {
    title: tool.name,
    description: `Every prompt tested and tagged compatible with ${tool.name}.`,
    alternates: { canonical: `https://thepromptgalaxy.com/tool/${tool.slug}/` },
  }
}

export default async function ToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool: toolSlug } = await params
  const tool = await getToolBySlug(toolSlug)
  if (!tool) notFound()

  const prompts = await getPromptsByTool(tool.id)

  return (
    <ArchiveListing
      title={tool.name}
      intro={`Every prompt tested and tagged compatible with ${tool.name}.`}
      prompts={prompts}
      crumbs={[
        { label: 'Home', href: '/' },
        { label: tool.name, href: `/tool/${tool.slug}/` },
      ]}
      canonicalUrl={`https://thepromptgalaxy.com/tool/${tool.slug}/`}
    />
  )
}
