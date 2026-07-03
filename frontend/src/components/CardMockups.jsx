import React from 'react'
import { QRCodeSVG } from 'qrcode.react'

// EDIT: once deployed, point this at the real Amplify URL, e.g.
// https://main.xxxxxxx.amplifyapp.com/#/card-front (etc per touchpoint)
const BASE_URL = 'https://main.d2llxfb8l9kp9d.amplifyapp.com/#'

export default function CardMockups() {
  return (
    <div style={styles.page}>
      <h1 style={styles.h1}>IRH Business Card — Three Touchpoints</h1>
      <p style={styles.sub}>Reference mockups for the physical card and email signature. Not the live app.</p>

      <div style={styles.row}>
        <CardFront />
        <CardBack />
      </div>

      <h2 style={styles.h2}>Email Signature</h2>
      <EmailSignature />
    </div>
  )
}

function CardFront() {
  return (
    <div style={{ ...styles.card, ...styles.cardFront }}>
      <div style={styles.cardMark}>IRH</div>
      <div style={{ marginTop: 'auto' }}>
        <div style={styles.name}>Vineet Mehra</div>
        <div style={styles.role}>Chief Executive Officer</div>
        <div style={styles.contactLine}>vineet.mehra@irh-example.com</div>
        <div style={styles.contactLine}>+971 4 000 0000</div>
      </div>
      <div style={styles.scanHint}>
        <QRCodeSVG value={`${BASE_URL}/card-front`} size={44} bgColor="transparent" fgColor="#c9a227" />
        <span style={styles.scanText}>Scan to ask&nbsp;IRH AI</span>
      </div>
    </div>
  )
}

function CardBack() {
  return (
    <div style={{ ...styles.card, ...styles.cardBack }}>
      <QRCodeSVG value={`${BASE_URL}/card-back`} size={128} bgColor="transparent" fgColor="#f6f4ee" />
      <div style={styles.backLabel}>IRH AI ASSISTANT</div>
      <div style={styles.backSub}>Ask questions · Book meetings · Reach the right team</div>
    </div>
  )
}

function EmailSignature() {
  return (
    <table style={styles.sigTable} cellPadding="0" cellSpacing="0">
      <tbody>
        <tr>
          <td style={{ paddingRight: 16, borderRight: '2px solid #c9a227' }}>
            <div style={{ fontWeight: 700, color: '#0b1f3a', fontSize: 15 }}>Vineet Mehra</div>
            <div style={{ color: '#5b6472', fontSize: 12.5 }}>Chief Executive Officer, IRH</div>
            <div style={{ color: '#5b6472', fontSize: 12, marginTop: 4 }}>vineet.mehra@irh-example.com · +971 4 000 0000</div>
          </td>
          <td style={{ paddingLeft: 16 }}>
            <a href={`${BASE_URL}/signature`} style={{ fontSize: 12, color: '#0b1f3a', textDecoration: 'none', fontWeight: 600 }}>
              💬 Ask the IRH AI Assistant
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  )
}

const styles = {
  page: { fontFamily: 'Inter, sans-serif', background: '#f6f4ee', minHeight: '100vh', padding: 32 },
  h1: { color: '#0b1f3a', fontSize: 20, marginBottom: 4 },
  h2: { color: '#0b1f3a', fontSize: 16, marginTop: 32 },
  sub: { color: '#5b6472', fontSize: 13, marginBottom: 24 },
  row: { display: 'flex', gap: 24, flexWrap: 'wrap' },
  card: {
    width: 336,
    height: 192,
    borderRadius: 12,
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 8px 24px rgba(11,31,58,0.18)',
    fontFamily: 'Inter, sans-serif',
  },
  cardFront: { background: 'linear-gradient(135deg,#0b1f3a,#071427)', color: 'white', position: 'relative' },
  cardMark: { fontFamily: 'Georgia, serif', letterSpacing: 2, color: '#c9a227', fontWeight: 700, fontSize: 18 },
  name: { fontSize: 16, fontWeight: 700 },
  role: { fontSize: 12, color: '#c9a227', marginTop: 2 },
  contactLine: { fontSize: 10.5, color: '#b9c2d0', marginTop: 6 },
  scanHint: { position: 'absolute', right: 16, bottom: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 },
  scanText: { fontSize: 8, color: '#c9a227', textAlign: 'center', maxWidth: 60 },
  cardBack: {
    background: '#0b1f3a',
    color: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    gap: 8,
  },
  backLabel: { fontSize: 13, letterSpacing: 2, color: '#c9a227', fontWeight: 700, marginTop: 8 },
  backSub: { fontSize: 10.5, color: '#b9c2d0' },
  sigTable: { background: 'white', padding: 16, borderRadius: 6, border: '1px solid #e6e2d4' },
}
