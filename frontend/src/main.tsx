import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import StudyModeApp from './StudyModeApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StudyModeApp />
  </StrictMode>,
)
