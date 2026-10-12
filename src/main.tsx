import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { importLegacyData } from './lib/db'
import { startSync } from './lib/sync'

// Copy over data from the pre-sync database before sync can upload anything.
importLegacyData()
  .catch((e) => console.error('Importing local data failed', e))
  .finally(startSync)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
