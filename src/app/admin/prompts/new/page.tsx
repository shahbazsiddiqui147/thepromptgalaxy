import { requireUser } from '@/lib/current-user'
import { emptyPrompt } from '@/prompts/types'
import { loadFormOptions } from '../options'
import { PromptForm } from '../PromptForm'

export default async function NewPromptPage() {
  await requireUser(['admin', 'editor'])
  return (
    <>
      <div className="admin-head">
        <h1>New prompt</h1>
      </div>
      <PromptForm initial={emptyPrompt()} slugLocked={false} options={await loadFormOptions(null)} />
    </>
  )
}
