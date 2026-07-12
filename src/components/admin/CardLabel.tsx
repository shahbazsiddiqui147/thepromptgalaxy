'use client'

import React from 'react'
import {
  FileText,
  Tag,
  Image as ImageIcon,
  Sparkles,
  HelpCircle,
  Link2,
  Palette,
  Wrench,
} from 'lucide-react'
import type { CollapsibleFieldClient } from 'payload'

// Custom `admin.components.Label` for the collapsible "card" fields used
// throughout the admin redesign. Verified directly against a live document
// (React fiber inspection): Payload does NOT pass the collapsible's label as
// a top-level `label` prop here -- it passes the field's own client config
// as `props.field`, with the label at `field.label`. We key off that text to
// pick a matching icon rather than registering a separate component per
// card, so every card header stays defined in one place, driven entirely by
// the collection config's `label` value.
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
  Details: FileText,
  Icon: ImageIcon,
  'Word Choice Guide': Palette,
  Capabilities: Wrench,
}

const GOLD = '#C9A227'

export function CardLabel({ field }: { field?: CollapsibleFieldClient }) {
  const text = typeof field?.label === 'string' ? field.label : ''
  const Icon = ICONS[text]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      {Icon ? <Icon size={15} color={GOLD} /> : null}
      <span style={{ fontSize: 14.5, fontWeight: 700 }}>{text}</span>
    </div>
  )
}
