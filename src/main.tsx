import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Root from './Root.tsx'
import TumtumPulse from './components/TumtumPulse'
import { captureInviteFromUrl } from './lib/invite'
import { registerServiceWorker, takeTabFromUrl } from './lib/pwa'

captureInviteFromUrl()
registerServiceWorker()
takeTabFromUrl()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
    <TumtumPulse />
  </StrictMode>,
)
