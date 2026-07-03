import React, { useState, useRef, useEffect } from 'react'
import { CHAT_API_URL } from './config.js'

const SUGGESTIONS = [
  'What commodities does IRH trade?',
  "What is IRH's investment strategy?",
  'Where does IRH operate globally?',
  'How can I meet Vineet Mehra?',
  'Who should I speak to about LNG opportunities?',
  'How do I become a supplier or partner?',
]

function sessionKey() {
  let id = sessionStorage.getItem('irh_session_id')
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem('irh_session_id', id)
  }
  return id
}

function renderWithBold(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    return <React.Fragment key={i}>{part}</React.Fragment>
  })
}

export default function App({ source }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content:
        "Welcome to IRH. I'm the IRH AI Assistant — ask me about our commodities, strategy, global operations, financing solutions, or say who you'd like to meet.",
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [meetingBanner, setMeetingBanner] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function send(text) {
    const content = (text ?? input).trim()
    if (!content || loading) return
    const nextMessages = [...messages, { role: 'user', content }]
    setMessages(nextMessages)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch(CHAT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessionKey(),
          message: content,
          history: messages.map(({ role, content }) => ({ role, content })),
          source,
        }),
      })
      const data = await res.json()
      setMessages((m) => [...m, { role: 'assistant', content: data.reply || "Sorry, I couldn't process that." }])
      if (data.meetingCaptured) setMeetingBanner(true)
    } catch (e) {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'The assistant is temporarily unavailable. Please try again shortly.' },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-mark">IRH</div>
        <div className="brand-text">
          <div className="brand-name">IRH AI Assistant</div>
          <div className="brand-sub">Answers from approved IRH information</div>
        </div>
      </header>

      {meetingBanner && (
        <div className="meeting-banner">
          Your meeting request has been sent to Refilwe, PA to CEO Vineet Mehra — she'll follow up to confirm.
        </div>
      )}

      <main className="chat-window">
        {messages.map((m, i) => (
          <div key={i} className={`bubble-row ${m.role}`}>
           <div className="bubble">{renderWithBold(m.content)}</div>
          </div>
        ))}
        {loading && (
          <div className="bubble-row assistant">
            <div className="bubble typing">…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      <div className="suggestions">
        {SUGGESTIONS.map((s) => (
          <button key={s} className="chip" onClick={() => send(s)} disabled={loading}>
            {s}
          </button>
        ))}
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault()
          send()
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about IRH, request a meeting, or find the right team…"
        />
        <button type="submit" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>

      <footer className="app-footer">Approved IRH information only · irh-example.com</footer>
    </div>
  )
}
