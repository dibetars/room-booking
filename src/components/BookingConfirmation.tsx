import { useLocation, useNavigate } from 'react-router-dom';
import './BookingConfirmation.css';

const BookingConfirmation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { reference, amount, status } = location.state || {};

  if (!reference || !amount || status !== 'success') {
    return (
      <div className="booking-confirmation error">
        <h2>Invalid Booking Information</h2>
        <p>We couldn't find your booking details. Please contact support.</p>
        <button onClick={() => navigate('/')}>Return to Home</button>
      </div>
    );
  }

  return (
    <div className="booking-confirmation">
      <div className="confirmation-content">
        <div className="success-icon">✓</div>
        <h2>Booking Confirmed!</h2>
        <div className="booking-details">
          <p>Payment Reference: {reference}</p>
          <p>Amount Paid: GHS {amount}</p>
        </div>
        <p className="confirmation-message">
          Thank you for your booking! We've sent a confirmation email with all the details.
        </p>
        <button onClick={() => navigate('/')}>Return to Home</button>
      </div>
    </div>
  );
};

export default BookingConfirmation; 