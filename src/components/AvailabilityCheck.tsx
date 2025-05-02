import { useState } from 'react';
import axios from 'axios';
import './AvailabilityCheck.css';

interface AvailabilityResponse {
  // Add response type based on the API response
  [key: string]: any;
}

const AvailabilityCheck = () => {
  const [arrivalDate, setArrivalDate] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [availabilityData, setAvailabilityData] = useState<AvailabilityResponse | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/check-availability`,
        {
          arrivalDate,
          departureDate,
          apartments: [],
          customerId: 1107218
        }
      );

      setAvailabilityData(response.data);
      setIsModalOpen(true);
    } catch (err) {
      setError('Failed to check availability. Please try again.');
      console.error('Error checking availability:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="availability-check">
      <form onSubmit={handleSubmit} className="availability-form">
        <div className="form-group">
          <label htmlFor="arrivalDate">Arrival Date:</label>
          <input
            type="date"
            id="arrivalDate"
            value={arrivalDate}
            onChange={(e) => setArrivalDate(e.target.value)}
            required
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div className="form-group">
          <label htmlFor="departureDate">Departure Date:</label>
          <input
            type="date"
            id="departureDate"
            value={departureDate}
            onChange={(e) => setDepartureDate(e.target.value)}
            required
            min={arrivalDate || new Date().toISOString().split('T')[0]}
          />
        </div>

        <button 
          type="submit" 
          className="check-button"
          disabled={isLoading}
        >
          {isLoading ? 'Checking...' : 'Check Availability'}
        </button>

        {error && <div className="error-message">{error}</div>}
      </form>

      {isModalOpen && availabilityData && (
        <div className="modal-overlay">
          <div className="modal-content">
            <button 
              className="close-button"
              onClick={() => setIsModalOpen(false)}
            >
              ×
            </button>
            <h2>Availability Results</h2>
            <pre className="response-data">
              {JSON.stringify(availabilityData, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailabilityCheck; 