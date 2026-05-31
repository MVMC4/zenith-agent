import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './shared/styles.css'

console.log('🎨 Zenith Renderer Starting...')
console.log('🔍 Root element:', document.getElementById('root'))

try {
  const root = document.getElementById('root')
  if (!root) throw new Error('#root not found')
  
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
  console.log('✅ React mounted successfully')
} catch (err) {
  console.error('❌ Failed to mount React:', err)
  // Fallback visible error
  document.body.innerHTML = `
    <div style="padding:20px;color:#ece9e3;background:#1a0000;font-family:monospace">
      <strong>❌ Zenith Render Error</strong><br/>
      <pre>${err instanceof Error ? err.message : String(err)}</pre>
    </div>
  `
}
