import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import SimpleIntegratedApp from './SimpleIntegratedApp.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SimpleIntegratedApp />
  </StrictMode>,
)
