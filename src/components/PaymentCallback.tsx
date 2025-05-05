import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PaymentService from '../services/paymentService';
import './PaymentCallback.css';

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying payment...');

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const reference = searchParams.get('reference');
        const trxref = searchParams.get('trxref');

        if (!reference || !trxref) {
          throw new Error('Missing payment reference');
        }

        const paymentService = PaymentService.getInstance();
        const response = await paymentService.verifyPayment(reference);

        if (response.data.status === 'success') {
          setStatus('success');
          setMessage('Payment successful! Redirecting to booking confirmation...');
          // Redirect to booking confirmation after 3 seconds
          setTimeout(() => {
            navigate('/booking-confirmation', { 
              state: { 
                reference,
                amount: response.data.amount / 100, // Convert from pesewas to cedis
                status: 'success'
              }
            });
          }, 3000);
        } else {
          setStatus('error');
          setMessage('Payment verification failed. Please contact support.');
        }
      } catch (error) {
        console.error('Payment verification error:', error);
        setStatus('error');
        setMessage('An error occurred while verifying your payment. Please contact support.');
      }
    };

    verifyPayment();
  }, [searchParams, navigate]);

  return (
    <div className="payment-callback">
      <div className={`status-container ${status}`}>
        <div className="status-icon">
          {status === 'loading' && <div className="spinner"></div>}
          {status === 'success' && <span className="success-icon">✓</span>}
          {status === 'error' && <span className="error-icon">✕</span>}
        </div>
        <h2>{message}</h2>
        {status === 'error' && (
          <button 
            className="retry-button"
            onClick={() => navigate(-1)}
          >
            Go Back
          </button>
        )}
      </div>
    </div>
  );
};

export default PaymentCallback; 