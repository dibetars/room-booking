import { useState } from 'react';
import PaymentService from '../services/paymentService';
import './PaymentTest.css';

const PaymentTest = () => {
  const [email, setEmail] = useState('');
  const [amount, setAmount] = useState('10');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'momo'>('card');
  const [phone, setPhone] = useState('');
  const [provider, setProvider] = useState<'vod' | 'mtn' | 'atl'>('vod');
  const [status, setStatus] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setStatus('Processing payment...');
    setPaymentReference(null);

    try {
      const paymentService = PaymentService.getInstance();
      const amountInGHS = parseFloat(amount);

      if (paymentMethod === 'momo') {
        const response = await paymentService.initiateMobileMoneyPayment(
          email,
          amountInGHS,
          phone,
          provider
        );

        if (response.status) {
          setPaymentReference(response.data.reference);
          setStatus('Payment initiated. Please check your phone for the payment prompt.');
        } else {
          setStatus('Failed to initiate payment. Please try again.');
        }
      } else {
        await paymentService.initiateCardPayment(
          email,
          amountInGHS
        );
        // The redirect will happen automatically in the service
      }
    } catch (error) {
      console.error('Payment error:', error);
      setStatus('An error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!paymentReference) return;

    setIsVerifying(true);
    setStatus('Verifying payment...');

    try {
      const paymentService = PaymentService.getInstance();
      const response = await paymentService.verifyPayment(paymentReference);

      if (response.data.status === 'success') {
        setStatus('Payment successful!');
        setPaymentReference(null);
      } else if (response.data.status === 'failed') {
        setStatus('Payment failed. Please try again.');
        setPaymentReference(null);
      } else {
        setStatus('Payment is still pending. Please check your phone and try again.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('Error verifying payment. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="payment-test">
      <h2>Payment Test Section</h2>
      <div className="test-cards">
        <h3>Test Cards</h3>
        <div className="card-list">
          <div className="test-card">
            <h4>Visa</h4>
            <p>Number: 4084 0840 8408 4081</p>
            <p>Expiry: Any future date</p>
            <p>CVV: Any 3 digits</p>
          </div>
          <div className="test-card">
            <h4>Mastercard</h4>
            <p>Number: 5105 1051 0510 5100</p>
            <p>Expiry: Any future date</p>
            <p>CVV: Any 3 digits</p>
          </div>
        </div>
      </div>

      <form onSubmit={handlePayment} className="test-payment-form">
        <div className="form-group">
          <label htmlFor="test-email">Email:</label>
          <input
            type="email"
            id="test-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="test@example.com"
          />
        </div>

        <div className="form-group">
          <label htmlFor="test-amount">Amount (GHS):</label>
          <input
            type="number"
            id="test-amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            min="1"
            step="0.01"
          />
        </div>

        <div className="form-group">
          <label>Payment Method:</label>
          <div className="payment-method-selector">
            <button
              type="button"
              className={`payment-method-btn ${paymentMethod === 'card' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('card')}
            >
              Card Payment
            </button>
            <button
              type="button"
              className={`payment-method-btn ${paymentMethod === 'momo' ? 'active' : ''}`}
              onClick={() => setPaymentMethod('momo')}
            >
              Mobile Money
            </button>
          </div>
        </div>

        {paymentMethod === 'momo' && (
          <>
            <div className="form-group">
              <label htmlFor="test-phone">Phone Number:</label>
              <input
                type="tel"
                id="test-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                placeholder="e.g., 0244123456"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="test-provider">Mobile Money Provider:</label>
              <select
                id="test-provider"
                value={provider}
                onChange={(e) => setProvider(e.target.value as 'vod' | 'mtn' | 'atl')}
                required
              >
                <option value="vod">Vodafone Cash</option>
                <option value="mtn">MTN Mobile Money</option>
                <option value="atl">AirtelTigo Money</option>
              </select>
            </div>
          </>
        )}
        
        <button 
          type="submit" 
          className="test-pay-button"
          disabled={isProcessing}
        >
          {isProcessing ? 'Processing...' : 'Test Payment'}
        </button>
      </form>

      {status && (
        <div className={`test-status ${isProcessing || isVerifying ? 'processing' : ''}`}>
          {status}
        </div>
      )}

      {paymentReference && paymentMethod === 'momo' && (
        <div className="verify-payment-section">
          <button
            onClick={handleVerifyPayment}
            className="verify-button"
            disabled={isVerifying}
          >
            {isVerifying ? 'Verifying...' : 'Verify Payment'}
          </button>
        </div>
      )}
    </div>
  );
};

export default PaymentTest; 