'use client'

import { useState } from 'react'

const REASONS = ['General', 'Submission', 'Billing']

export function ContactForm() {
  const [reason, setReason] = useState(REASONS[0])
  const [note, setNote] = useState('')

  return (
    <form
      className="form-stack"
      style={{ maxWidth: 420 }}
      onSubmit={(event) => {
        event.preventDefault()
        // TODO: no contact backend exists. This form does not send the message.
        setNote('This form is not connected yet. Email hello@thepromptgalaxy.com and we will reply within two business days.')
      }}
    >
      <div className="field">
        <label htmlFor="contact-name">Name</label>
        <input id="contact-name" className="input" name="name" placeholder="Your name" required />
      </div>
      <div className="field">
        <label htmlFor="contact-email">Email</label>
        <input id="contact-email" className="input" type="email" name="email" placeholder="you@example.com" required />
      </div>
      <div className="field">
        <label>Reason</label>
        <div className="seg" style={{ width: 'fit-content' }}>
          {REASONS.map((item) => (
            <label key={item} className="seg-opt">
              <input type="radio" name="reason" value={item} checked={reason === item} onChange={() => setReason(item)} />
              {item}
            </label>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="contact-message">Message</label>
        <textarea id="contact-message" className="input" name="message" rows={5} placeholder="How can we help?" required />
      </div>
      <button type="submit" className="btn btn-primary" style={{ padding: '13px 22px', fontSize: 15, alignSelf: 'flex-start' }}>
        Send message
      </button>
      {note && <p className="form-note">{note}</p>}
    </form>
  )
}
