import './Footer.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFacebook, faInstagram } from '@fortawesome/free-brands-svg-icons';

interface FooterProps {
  onBookNow?: () => void;
}

const Footer = ({ onBookNow }: FooterProps) => {
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <div className="footer-column">
            <div className="footer-logo" onClick={scrollToTop} style={{ cursor: 'pointer' }}>
              <img src="/images/Boko-Logo.png" alt="BokoBoko Logo" />
            </div>
            <p className="footer-description">
              At BokoBoko, Living with Nature is our way of life.
            </p>
            <button className="footer-book-now" onClick={onBookNow}>Book Now</button>
            <div className="social-icons">
              <a href="https://web.facebook.com/OPCGH" target="_blank" rel="noopener noreferrer">
                <FontAwesomeIcon icon={faFacebook} />
              </a>
              <a href="https://www.instagram.com/bokobokoopc_" target="_blank" rel="noopener noreferrer">
                <FontAwesomeIcon icon={faInstagram} />
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
        © 2025 BokoBoko. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer; 