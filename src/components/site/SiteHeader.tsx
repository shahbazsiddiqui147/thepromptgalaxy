import Link from 'next/link'
import { AccountLink } from '@/components/AccountLink'
import { SearchForm } from '@/components/SearchForm'
import { BrandMark } from '@/components/site/BrandMark'
import { NavLinks } from '@/components/site/NavLinks'
import { SocialIcons } from '@/components/site/SocialIcons'

export function SiteHeader() {
  return (
    <header className="nav site-header">
      <BrandMark />
      <NavLinks />
      <SearchForm />
      <SocialIcons />
      <div className="header-actions">
        <AccountLink />
        <Link href="/submit/" className="btn btn-secondary">
          Submit
        </Link>
        <Link href="/premium/" className="btn btn-primary">
          Go Premium
        </Link>
      </div>
    </header>
  )
}
