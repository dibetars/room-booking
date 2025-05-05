import { ReactNode, useState } from 'react';
import './Layout.css';

interface LayoutProps {
  children: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <div className="layout">
      <header className="header">
        <div className="logo">
          <img src="/images/Boko-Logo.png" alt="BokoBoko Logo" />
        </div>
        <button className="hamburger-menu" onClick={toggleMenu} aria-label="Toggle menu">
          {isMenuOpen ? '✕' : '☰'}
        </button>
        <nav className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
          <ul>
            <li><a href="/" onClick={() => setIsMenuOpen(false)}>Home</a></li>
            <li><a href="/rooms" onClick={() => setIsMenuOpen(false)}>Rooms</a></li>
            <li><a href="/about" onClick={() => setIsMenuOpen(false)}>About</a></li>
            <li><a href="/contact" onClick={() => setIsMenuOpen(false)}>Contact</a></li>
          </ul>
        </nav>
      </header>

      <main className="main-content">
        {children}
      </main>

      <footer className="footer">
        <p>&copy; 2024 Room Booking. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Layout; 