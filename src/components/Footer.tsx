import React from 'react';
import './Footer.css';

const Footer = () => {
  const scrollToHero = () => {
    const heroSection = document.querySelector('.hero');
    if (heroSection) {
      heroSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <div className="footer-column">
            <div className="footer-logo">
              <img src="/images/Boko-Logo.png" alt="BokoBoko Logo" />
            </div>
            <p className="footer-description">
              At BokoBoko, Living with Nature is our way of life.
            </p>
            <button className="footer-book-now" onClick={scrollToHero}>
              Book Now
            </button>
            <div className="social-icons">
              <a href="https://www.facebook.com/OPCGH/" target="_blank" rel="noopener noreferrer">
                <i className="fab fa-facebook"></i>
              </a>
              <a href="https://www.instagram.com/bokobokoopc_" target="_blank" rel="noopener noreferrer">
                <i className="fab fa-instagram"></i>
              </a>
            </div>
          </div>
          <div className="footer-column"></div>
          <div className="footer-column"></div>
          <div className="footer-column"></div>
        </div>
      </div>
      <div className="footer-separator"></div>
      <div className="footer-copyright">
        Copyright © 2025 Boko Boko | All Rights Reserved
      </div>
    </footer>
  );
};

export default Footer; 