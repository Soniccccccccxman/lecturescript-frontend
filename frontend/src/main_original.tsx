import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import LiveTranscriptApp from './LiveTranscriptApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LiveTranscriptApp />
  </StrictMode>,
)
