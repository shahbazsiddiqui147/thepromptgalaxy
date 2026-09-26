import Link from 'next/link'
import { compactNumber, promptUrl, type Card } from '@/site/types'

export function PromptCard({ card }: { card: Card }) {
  return (
    <Link href={promptUrl(card.slug)} className="pcard">
      <div className="pcard-img">
        {card.exampleMediaId ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={`/media/${card.exampleMediaId}/card/`} alt={card.title} loading="lazy" />
        ) : null}
        <div className="pcard-badges">
          {card.isPremium ? <span className="b-premium">PREMIUM</span> : <span className="b-free">FREE</span>}
          {card.isChain ? <span className="b-chain">CHAIN · {card.stepCount} STEPS</span> : null}
        </div>
        {card.exampleMediaId ? null : <span className="pcard-cap">Example output</span>}
      </div>
      <div className="pcard-body">
        <span className="pcard-kicker">{card.categoryName}</span>
        <span className="pcard-title">{card.title}</span>
        <div className="pcard-meta">
          {card.authorHandle ? <span>@{card.authorHandle}</span> : null}
          <span>{compactNumber(card.saveCount)} saves</span>
          {card.primaryToolName ? <span>{card.primaryToolName}</span> : null}
        </div>
      </div>
    </Link>
  )
}
