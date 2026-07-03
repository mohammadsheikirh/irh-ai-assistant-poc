import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Routes, Route } from 'react-router-dom'
import App from './App.jsx'
import CardMockups from './components/CardMockups.jsx'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        {/* This is what a scanned QR code opens: source is passed as a query param
            so engagement logs know whether the scan came from the front, back, or
            an email signature link. */}
        <Route path="/" element={<App source="direct" />} />
        <Route path="/card-front" element={<App source="card_front" />} />
        <Route path="/card-back" element={<App source="card_back" />} />
        <Route path="/signature" element={<App source="email_signature" />} />
        <Route path="/mockups" element={<CardMockups />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>,
)
