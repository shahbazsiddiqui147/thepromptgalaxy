'use client'

import { useRowLabel } from '@payloadcms/ui'

type StepRowData = {
  label?: string
}

export function StepRowLabel() {
  const { data, rowNumber } = useRowLabel<StepRowData>()
  const stepNumber = rowNumber ?? 1
  return <div>{data?.label ? `${stepNumber}. ${data.label}` : `Step ${stepNumber}`}</div>
}
