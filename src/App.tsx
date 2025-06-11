import './App.css';
import Home from './components/Home';
import Footer from './components/Footer';
import { useState } from 'react';

function App() {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  // This handler will be passed to both Home and Footer
  const handleBookNow = () => setIsBookingModalOpen(true);

  return (
    <div className="app">
      <Home isBookingModalOpen={isBookingModalOpen} setIsBookingModalOpen={setIsBookingModalOpen} handleBookNow={handleBookNow} />
      <Footer onBookNow={handleBookNow} />
    </div>
  );
}

export default App;
