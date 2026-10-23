import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// The scene's existing canvas labels use Rubik independently of the interface.
import '@fontsource/rubik/latin-600.css'
import App from './App'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
