import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import PaymentCallback from './components/PaymentCallback'
import BookingConfirmation from './components/BookingConfirmation'
import { library } from '@fortawesome/fontawesome-svg-core'
import { faBars, faTimes } from '@fortawesome/free-solid-svg-icons'

// Add icons to the library
library.add(faBars, faTimes)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/payment-callback" element={<PaymentCallback />} />
        <Route path="/booking-confirmation" element={<BookingConfirmation />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
