import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import StreamingLiveTranscriptApp from './StreamingLiveTranscriptApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StreamingLiveTranscriptApp />
  </StrictMode>,
)