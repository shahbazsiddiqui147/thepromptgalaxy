'use client'

import React from 'react'
import {
  FileText,
  Tag,
  Image as ImageIcon,
  Sparkles,
  HelpCircle,
  Link2,
} from 'lucide-react'
import type { GenericLabelProps } from 'payload'

// Custom `admin.components.Label` for the collapsible "card" fields used
// throughout the admin redesign. Payload passes the collapsible's own
// `label` string through as a prop -- we key off that text to pick a matching
// icon rather than registering a separate component per card, so every card
// header stays defined in one place, driven entirely by the collection
// config's `label` value.
const ICONS: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  Content: FileText,
  Taxonomy: Tag,
  'Cover Image': ImageIcon,
  'Reference Image': ImageIcon,
  'Prompt Text': FileText,
  'Example Results': Sparkles,
  'Quick Answer': Sparkles,
  Article: FileText,
  FAQs: HelpCircle,
  'Similar Prompts': Link2,
}

const GOLD = '#C9A227'

export function CardLabel({ label }: GenericLabelProps) {
  const text = typeof label === 'string' ? label : ''
  const Icon = ICONS[text]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {Icon ? <Icon size={15} color={GOLD} /> : null}
      <span style={{ fontSize: 14.5, fontWeight: 700 }}>{text}</span>
    </div>
  )
}
