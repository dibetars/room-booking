import { useState, useEffect } from 'react';
import './Home.css';
import BookingModal from './BookingModal';
import ExchangeRateService from '../services/exchangeRateService';
import GoogleReviews from './GoogleReviews';

interface HomeProps {
  isBookingModalOpen: boolean;
  setIsBookingModalOpen: (open: boolean) => void;
  handleBookNow: () => void;
}

const Home = ({ isBookingModalOpen, setIsBookingModalOpen, handleBookNow }: HomeProps) => {
  const [isNavbarScrolled, setIsNavbarScrolled] = useState(false);
  const [exchangeRate, setExchangeRate] = useState<number>(14.3); // Default fallback

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsNavbarScrolled(scrollPosition > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const exchangeRateService = ExchangeRateService.getInstance();
    setExchangeRate(exchangeRateService.getCurrentRate());
    const interval = setInterval(() => {
      setExchangeRate(exchangeRateService.getCurrentRate());
    }, 1000 * 60 * 60);
    return () => clearInterval(interval);
  }, []);

  const usdToGhs = (usd: number) => Math.round(usd * exchangeRate * 100) / 100;

  return (
    <div className="home">
      {/* Navbar */}
      <nav className={`navbar ${isNavbarScrolled ? 'scrolled' : ''}`}>
        <div className="nav-content">
          <div className="logo" onClick={scrollToTop} style={{ cursor: 'pointer' }}>
            <img src="/images/Boko-Logo.png" alt="BokoBoko Logo" />
          </div>
          <div className="nav-links">
            <a href="#about">About</a>
            <a href="#rooms">Rooms</a>
            <a href="#amenities">Amenities</a>
            <a href="#contact">Contact</a>
            <button className="book-now-btn" onClick={handleBookNow}>Book Now</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="video-background">
          <video autoPlay muted loop>
            <source src="/videos/hero-background.mp4" type="video/mp4" />
          </video>
        </div>
        <div className="hero-content">
          <h1 className="typing-text">Eco-Friendly accommodation built with sustainable comfort in mind</h1>
          <button className="hero-book-now" onClick={handleBookNow}>Book Now</button>
        </div>
      </section>

      {/* Starlink Announcement */}
      <section className="starlink-announcement">
        <div className="container">
          <h2>We are excited to announce </h2>
          <h2>that BokoBoko now has Starlink!</h2>
          <div style={{ height: '25px' }} />
          <button className="book-now-btn" onClick={handleBookNow}>Book Now</button>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about-section">
        <div className="container">
          <div className="about-content">
            <div className="about-image">
              <img src="/images/about-image.jpg" alt="BokoBoko Eco-Friendly Accommodation" />
            </div>
            <div className="about-text">
              <h2>Living in harmony with nature isn't just a philosophy.</h2>
              <p>
                At BokoBoko, living with nature is our way of life. Many of the ingredients for our meals and drinks are nurtured in our garden, a testament to our commitment to a natural cycle of growth and sustainability. Our guesthouse and furnishings are crafted using sustainable construction techniques that respect the environment. This cyclical approach allows us to offer affordable lodging while fairly compensating our staff. All profits are redirected into OPC, the NGO that initially brought BokoBoko to life. 
              </p>
              <button className="book-now-btn" onClick={handleBookNow}>Book Now</button>
            </div>
          </div>
        </div>
      </section>

      {/* Rooms Section */}
      <section id="rooms" className="rooms-section">
        <div className="container">
          <h2>Guaranteed sustainable living without compromising comfort</h2>
          <div className="rooms-grid">
            <div className="room-card">
              <div className="room-image">
                <img src="/images/rooms/StandardRoom.jpg" alt="Standard Room" />
              </div>
              <div className="room-content">
                <h3>Standard Room</h3>
                <p>Our standard rooms (Generosity Room, Love Room, Humility Room, and Wisdom Room) come equipped with ensuite bathrooms, providing privacy and convenience. Enjoy a cozy and peaceful space with access to shared rooftop terrace, kitchenette, farm-to-table dining, bar, and more. Starting at $30 (GHS {usdToGhs(30)}) per night.</p>
                <button className="book-now-btn" onClick={handleBookNow}>Book Now</button>
              </div>
            </div>
            <div className="room-card">
              <div className="room-image">
                <img src="/images/rooms/DeluxeRoom.jpg" alt="Deluxe Room" />
              </div>
              <div className="room-content">
                <h3>Deluxe Room (with air conditioning)</h3>
                <p>Our deluxe rooms (Patient Room and Regeneration Room) feature natural materials, energy-efficient lighting, and thoughtful decor. Perfect for couples or solo travelers, these rooms include air conditioning for your comfort with access to shared rooftop terrace, kitchenette, farm-to-table dining, bar, and more. Starting at $35 (GHS {usdToGhs(35)}) per night.</p>
                <button className="book-now-btn" onClick={handleBookNow}>Book Now</button>
              </div>
            </div>
            <div className="room-card">
              <div className="room-image">
                <img src="/images/rooms/FamilyRoom.jpg" alt="Family Room" />
              </div>
              <div className="room-content">
                <h3>Family Room</h3>
                <p>For families seeking a spacious retreat, our family rooms (Truth/Honesty Room) offers ample accommodation with extra space for your loved ones to connect and unwind with access to shared rooftop terrace, kitchenette, farm-to-table dining, bar, and more. Starting at $40 (GHS {usdToGhs(40)}) per night.</p>
                <button className="book-now-btn" onClick={handleBookNow}>Book Now</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Amenities Section */}
      <section id="amenities" className="amenities-section">
        <div className="container">
          <h2>We offer to our guests</h2>
          <div className="amenities-grid">
            {/* Row 1: Rooftop (2 columns) and Kitchenette (1 column) */}
            <div className="amenity-card">
              <div className="card-inner">
                <div className="card-front">
                  <img src="/images/rooftop.jpg" alt="RoofTop Terrace" />
                  <h3>Rooftop terrace</h3>
                </div>
                <div className="card-back">
                  <p>Experience calm relaxation atop our rooftop terrace with panoramic views of the surrounding ecovillage and undulating hills invite moments of reflection and tranquility. Whether you're stargazing under the night sky or basking in the warmth of the sun, this rooftop oasis offers a sanctuary for guests to unwind and connect with nature.</p>
                </div>
              </div>
            </div>

            <div className="amenity-card">
              <div className="card-inner">
                <div className="card-front">
                  <img src="/images/kitchen.jpg" alt="Kitchenette" />
                  <h3>Kitchenette for culinary exploration</h3>
                </div>
                <div className="card-back">
                  <p>For guests craving the comforts of home or wishing to explore their culinary creativity, our guesthouse features a convenient kitchenette. Stocked with essential cookware, utensils, and appliances, this communal space invites guests to prepare their own meals using locally sourced ingredients.</p>
                </div>
              </div>
            </div>

            {/* Row 2: Agro, Farm, Local Brews */}
            <div className="amenity-card">
              <div className="card-inner">
                <div className="card-front">
                  <img src="/images/agro.jpg" alt="Agritourism" />
                  <h3>Agritourism and beyond</h3>
                </div>
                <div className="card-back">
                  <p>Immerse yourself in the rhythms of rural life with hands-on experiences in organic farming, traditional crafts, and cultural exchanges. Our agritourism programs offer a unique opportunity to connect with the land and local community.</p>
                </div>
              </div>
            </div>

            <div className="amenity-card">
              <div className="card-inner">
                <div className="card-front">
                  <img src="/images/farm.jpg" alt="Farm-to-Table" />
                  <h3>Farm-to-table dining </h3>
                </div>
                <div className="card-back">
                  <p>Start your day with a delicious breakfast made from fresh, organic ingredients sourced directly from our garden and local farmers. Experience the true taste of farm-to-table dining.</p>
                </div>
              </div>
            </div>

            <div className="amenity-card">
              <div className="card-inner">
                <div className="card-front">
                  <img src="/images/local.jpg" alt="Local Brews" />
                  <h3>Local brews and beyond</h3>
                </div>
                <div className="card-back">
                  <p>Our bar features a selection of local brews crafted by nearby artisans. Enjoy refreshing drinks while soaking in the vibrant atmosphere of our eco-friendly space.</p>
                </div>
              </div>
            </div>

            {/* Row 3: Cultural, Cape Coast, Surf */}
            <div className="amenity-card">
              <div className="card-inner">
                <div className="card-front">
                  <img src="/images/cultural.jpg" alt="Cultural Experiences" />
                  <h3>Cultural experiences</h3>
                </div>
                <div className="card-back">
                  <p>Immerse yourself in the rich traditions of West African hospitality and culture. Participate in local customs, music, and art that make your stay truly memorable.</p>
                </div>
              </div>
            </div>

            <div className="amenity-card">
              <div className="card-inner">
                <div className="card-front">
                  <img src="/images/cape.jpg" alt="Cape Coast Journey" />
                  <h3>Cape Coast journey</h3>
                </div>
                <div className="card-back">
                  <p>Embark on a historical journey through Ghana's Central Region. Explore the rich heritage and stunning landscapes that make this area unique.</p>
                </div>
              </div>
            </div>

            <div className="amenity-card">
              <div className="card-inner">
                <div className="card-front">
                  <img src="/images/surf.jpg" alt="Surfing" />
                  <h3>Surfing</h3>
                </div>
                <div className="card-back">
                  <p>Experience the thrill of surfing with lessons from our partner local surf schools. Whether you're a beginner or experienced surfer, enjoy the perfect waves of our coastal location.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Google Reviews Section */}
      <section id="google-reviews" className="google-reviews-section" style={{ background: '#f8f9fa', padding: '60px 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'center' }}>
          <GoogleReviews />
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact-section">
        <div className="container">
          <div className="contact-grid">
            <div className="contact-info">
              <h2>Book your eco-getaway with us!</h2>
              <p>Escape the hustle and bustle of life and embark on a journey of eco-friendly discovery at our guesthouse.</p>
              <div className="contact-details"> 
                <p>Phone: +233 25 607 8747</p>
                <p>Address: Busua, Western Region, Ghana</p>
                <p>Email: info@bokoboko.org</p>
              </div>
              <button className="book-now-btn" onClick={handleBookNow}>Book Now</button>
            </div>
            <div className="contact-image">
              <img src="/images/terra.jpg" alt="BokoBoko Terra" />
            </div>
          </div>
        </div>
      </section>

      {/* Booking Modal */}
      <BookingModal 
        isOpen={isBookingModalOpen} 
        onClose={() => setIsBookingModalOpen(false)} 
      />
    </div>
  );
};

export default Home; 