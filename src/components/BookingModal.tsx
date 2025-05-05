import { useState, useEffect } from 'react';
import './BookingModal.css';
import ExchangeRateService from '../services/exchangeRateService';
import PaymentService from '../services/paymentService';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Location {
  street: string;
  zip: string;
  city: string;
  country: string;
  latitude: string;
  longitude: string;
}

interface Rooms {
  maxOccupancy: number;
  bedrooms: number;
  bathrooms: number;
  doubleBeds: number;
  singleBeds: number;
  sofaBeds: number | null;
  couches: number | null;
  childBeds: number | null;
  queenSizeBeds: number | null;
  kingSizeBeds: number | null;
}

interface RoomDetails {
  location: Location;
  timeZone: string;
  rooms: Rooms;
  equipments: string[];
  currency: string;
  price: {
    minimal: string;
    maximal: string;
  };
  type: {
    id: number;
    name: string;
  };
}

interface Room {
  id: number;
  name: string;
  price: number;
  currency: string;
  available: boolean;
  description?: string;
  amenities?: string[];
  details?: RoomDetails;
  image?: string;
}

interface PaymentFormData {
  email: string;
  phone: string;
  provider: 'vod' | 'mtn' | 'atl';
  paymentMethod: 'momo' | 'card';
}

declare global {
  interface Window {
    PaystackPop: any;
  }
}

// Map of room IDs to their images
const roomImages: { [key: number]: string } = {
  2634263: '/images/rooms/StandardRoom.jpg',  // Room 1
  2509568: '/images/rooms/StandardRoom.jpg',  // Room 2
  2644078: '/images/rooms/DeluxeRoom.jpg',    // Room 3
  2634338: '/images/rooms/StandardRoom.jpg',  // Room 3a
  2634343: '/images/rooms/StandardRoom.jpg',  // Room 3b
  2509563: '/images/rooms/FamilyRoom.jpg',    // Room 4
  2509578: '/images/rooms/DeluxeRoom.jpg',    // Room 5
  2509573: '/images/rooms/FamilyRoom.jpg'     // Room 6
};

// Map of room IDs to their names
const roomNames: { [key: number]: string } = {
  2634263: 'Room 1',
  2509568: 'Room 2',
  2644078: 'Room 3',
  2634338: 'Room 3a',
  2634343: 'Room 3b',
  2509563: 'Room 4',
  2509578: 'Room 5',
  2509573: 'Room 6'
};

// Map of room IDs to their base prices
const roomBasePrices: { [key: number]: number } = {
  2634263: 35, // Room 1 - Deluxe Room with AC
  2509568: 35, // Room 2 - Deluxe Room with AC
  2644078: 40, // Room 3 - Family Room
  2634338: 30, // Room 3a - Standard Room
  2634343: 30, // Room 3b - Standard Room
  2509563: 30, // Room 4 - Standard Room
  2509578: 40, // Room 5 - Family Room
  2509573: 30  // Room 6 - Standard Room
};

const BookingModal = ({ isOpen, onClose }: BookingModalProps) => {
  const [step, setStep] = useState(1);
  const [bookingDetails, setBookingDetails] = useState<any>(null);
  const [arrivalDate, setArrivalDate] = useState('');
  const [departureDate, setDepartureDate] = useState('');
  const [availableRooms, setAvailableRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [exchangeRate, setExchangeRate] = useState<number>(14.3); // Default fallback rate
  const [paymentFormData, setPaymentFormData] = useState<PaymentFormData>({
    email: '',
    phone: '',
    provider: 'vod',
    paymentMethod: 'momo'
  });
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    // Initialize exchange rate service
    const exchangeRateService = ExchangeRateService.getInstance();
    setExchangeRate(exchangeRateService.getCurrentRate());

    // Update rate every hour
    const interval = setInterval(() => {
      setExchangeRate(exchangeRateService.getCurrentRate());
    }, 1000 * 60 * 60);

    return () => clearInterval(interval);
  }, []);

  const handleAvailabilityCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      console.log('Checking availability for dates:', {
        arrivalDate,
        departureDate
      });

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/check-availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          arrivalDate,
          departureDate,
          apartments: [],
          customerId: 1107218
        }),
      });

      const data = await response.json();
      console.log('Raw API Response:', data);
      
      if (data && data.availableApartments && data.prices) {
        console.log('Found apartments and prices in response:', {
          apartments: data.availableApartments,
          prices: data.prices
        });
        
        const rooms: Room[] = data.availableApartments
          .filter((apartmentId: number) => {
            const hasPrice = data.prices[apartmentId] && typeof data.prices[apartmentId].price === 'number';
            if (!hasPrice) {
              console.warn(`No valid price data found for apartment ${apartmentId}`);
            }
            return hasPrice;
          })
          .map((apartmentId: number) => {
            const priceData = data.prices[apartmentId];
            console.log(`Processing apartment ${apartmentId}:`, priceData);
            
            const room: Room = {
              id: apartmentId,
              name: roomNames[apartmentId] || `Room ${apartmentId}`,
              price: roomBasePrices[apartmentId] || priceData.price,
              currency: priceData.currency || '$',
              available: true,
              description: `Luxury accommodation with premium amenities`,
              amenities: ['WiFi', 'Air Conditioning', 'TV', 'Mini Bar'],
              image: roomImages[apartmentId]
            };
            
            console.log('Processed room:', room);
            return room;
          });
        
        console.log('Final processed rooms:', rooms);
        
        if (rooms.length === 0) {
          setError('No rooms with valid pricing found for the selected dates.');
          return;
        }
        
        setAvailableRooms(rooms);
        setStep(2);
      } else {
        console.log('No apartments or prices found in response or invalid response structure');
        setError('Invalid response from server. Please try again.');
      }
    } catch (err) {
      console.error('Error checking availability:', err);
      setError('Failed to check availability. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoomSelection = (room: Room) => {
    setSelectedRoom(room);
    setBookingDetails({
      ...bookingDetails,
      roomName: room.name,
      amount: room.price,
      checkin: arrivalDate,
      checkout: departureDate,
    });
    setStep(3);
  };

  const getCurrentExchangeRate = () => {
    return exchangeRate;
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoom) return;

    setIsProcessing(true);
    setPaymentStatus('Processing payment...');
    setPaymentReference(null);

    try {
      const paymentService = PaymentService.getInstance();
      const currentExchangeRate = getCurrentExchangeRate();
      const amountInGHS = selectedRoom.price * currentExchangeRate;

      if (paymentFormData.paymentMethod === 'momo') {
        const response = await paymentService.initiateMobileMoneyPayment(
          paymentFormData.email,
          amountInGHS,
          paymentFormData.phone,
          paymentFormData.provider
        );

        if (response.status) {
          setPaymentReference(response.data.reference);
          setPaymentStatus('Payment initiated. Please check your phone for the payment prompt.');
        } else {
          setPaymentStatus('Failed to initiate payment. Please try again.');
        }
      } else {
        // Card payment using redirect
        await paymentService.initiateCardPayment(
          paymentFormData.email,
          amountInGHS
        );
        // The redirect will happen automatically in the service
      }
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentStatus('An error occurred. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleVerifyPayment = async () => {
    if (!paymentReference) return;

    setIsVerifying(true);
    setPaymentStatus('Verifying payment...');

    try {
      const paymentService = PaymentService.getInstance();
      const response = await paymentService.verifyPayment(paymentReference);

      if (response.data.status === 'success') {
        setPaymentStatus('Payment successful!');
        setPaymentReference(null);
        setTimeout(() => onClose(), 2000);
      } else if (response.data.status === 'failed') {
        setPaymentStatus('Payment failed. Please try again.');
        setPaymentReference(null);
      } else {
        setPaymentStatus('Payment is still pending. Please check your phone and try again.');
      }
    } catch (error) {
      console.error('Verification error:', error);
      setPaymentStatus('Error verifying payment. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-button" onClick={onClose}>×</button>
        
        <div className="modal-steps">
          <div className={`step ${step === 1 ? 'active' : ''}`}>Check Availability</div>
          <div className={`step ${step === 2 ? 'active' : ''}`}>Available Rooms</div>
          <div className={`step ${step === 3 ? 'active' : ''}`}>Payment</div>
        </div>

        <div className="modal-body">
          {step === 1 && (
            <div className="availability-check">
              <form onSubmit={handleAvailabilityCheck} className="availability-form">
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
            </div>
          )}
          
          {step === 2 && (
            <div className="rooms-container">
              <div className="view-toggle">
                <button 
                  className={`toggle-button ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => setViewMode('grid')}
                >
                  Grid View
                </button>
                <button 
                  className={`toggle-button ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => setViewMode('list')}
                >
                  List View
                </button>
              </div>

              {isLoading ? (
                <div className="loading-message">Loading available rooms...</div>
              ) : availableRooms.length > 0 ? (
                <div className={`rooms-display ${viewMode}`}>
                  {availableRooms.map((room) => (
                    <div key={room.id} className={`room-card ${viewMode}`}>
                      <div className="room-content">
                        {viewMode === 'grid' ? (
                          <>
                            {roomImages[room.id] && (
                              <div className="room-image">
                                <img src={roomImages[room.id]} alt={room.name} />
                              </div>
                            )}
                            <div className="room-header">
                              <h3>{room.name}</h3>
                            </div>
                            {room.details && (
                              <div className="room-details">
                                <div className="details-section">
                                  <h4>Location</h4>
                                  <p>{room.details.location.street}</p>
                                  <p>{room.details.location.city}, {room.details.location.country}</p>
                                </div>
                                
                                <div className="details-section">
                                  <h4>Room Configuration</h4>
                                  <p>Bedrooms: {room.details.rooms.bedrooms}</p>
                                  <p>Bathrooms: {room.details.rooms.bathrooms}</p>
                                  <p>Max Occupancy: {room.details.rooms.maxOccupancy}</p>
                                  <p>Beds: {room.details.rooms.kingSizeBeds} King, {room.details.rooms.doubleBeds} Double, {room.details.rooms.singleBeds} Single</p>
                                </div>
                                
                                <div className="details-section">
                                  <h4>Equipment</h4>
                                  <div className="equipment-list">
                                    {room.details.equipments.map((item, index) => (
                                      <span key={index} className="equipment-tag">{item}</span>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                            <div className="room-price">
                              <span className="price">{room.currency}{room.price}</span>
                              <span className="per-night">per night</span>
                            </div>
                            {room.amenities && room.amenities.length > 0 && (
                              <div className="room-amenities">
                                {room.amenities.map((amenity, index) => (
                                  <span key={index} className="amenity-tag">{amenity}</span>
                                ))}
                              </div>
                            )}
                          </>
                        ) : (
                          <>
                            {roomImages[room.id] && (
                              <div className="room-image">
                                <img src={roomImages[room.id]} alt={room.name} />
                              </div>
                            )}
                            <div className="room-header">
                              <h3>{room.name}</h3>
                            </div>
                            <div className="room-price">
                              <span className="price">{room.currency}{room.price}</span>
                              <span className="per-night">/night</span>
                            </div>
                          </>
                        )}
                        <button
                          className="book-now-button"
                          onClick={() => handleRoomSelection(room)}
                          disabled={!room.available}
                        >
                          {room.available ? 'Book Now' : 'Not Available'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="no-rooms-message">
                  No rooms available for the selected dates.
                </div>
              )}
            </div>
          )}
          
          {step === 3 && selectedRoom && (
            <div className="payment-container">
              <div className="payment-header">
                <button 
                  className="back-button"
                  onClick={() => setStep(2)}
                >
                  ← Back to Rooms
                </button>
                <h3>Payment Details</h3>
              </div>
              <div className="booking-summary">
                <h4>Booking Summary</h4>
                <p>Room: {selectedRoom.name}</p>
                <p>Check-in: {arrivalDate}</p>
                <p>Check-out: {departureDate}</p>
                <div className="amount-container">
                  <p className="amount">Amount: {selectedRoom.currency}{selectedRoom.price} USD</p>
                  <p className="amount">(GHS {Math.round(selectedRoom.price * getCurrentExchangeRate() * 100) / 100})</p>
                </div>
              </div>
              
              <form onSubmit={handlePaymentSubmit} className="payment-form">
                <div className="form-group full-width">
                  <label htmlFor="email">Email:</label>
                  <input
                    type="email"
                    id="email"
                    value={paymentFormData.email}
                    onChange={(e) => setPaymentFormData(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>Payment Method:</label>
                  <div className="payment-method-selector">
                    <button
                      type="button"
                      className={`payment-method-btn ${paymentFormData.paymentMethod === 'momo' ? 'active' : ''}`}
                      onClick={() => setPaymentFormData(prev => ({ ...prev, paymentMethod: 'momo' }))}
                    >
                      Mobile Money
                    </button>
                    <button
                      type="button"
                      className={`payment-method-btn ${paymentFormData.paymentMethod === 'card' ? 'active' : ''}`}
                      onClick={() => setPaymentFormData(prev => ({ ...prev, paymentMethod: 'card' }))}
                    >
                      Card Payment
                    </button>
                  </div>
                </div>

                {paymentFormData.paymentMethod === 'momo' && (
                  <>
                    <div className="form-group">
                      <label htmlFor="phone">Phone Number:</label>
                      <input
                        type="tel"
                        id="phone"
                        value={paymentFormData.phone}
                        onChange={(e) => setPaymentFormData(prev => ({ ...prev, phone: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="provider">Mobile Money Provider:</label>
                      <select
                        id="provider"
                        value={paymentFormData.provider}
                        onChange={(e) => setPaymentFormData(prev => ({ ...prev, provider: e.target.value as 'vod' | 'mtn' | 'atl' }))}
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
                  className="pay-button"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : paymentFormData.paymentMethod === 'momo' ? 'Pay with Mobile Money' : 'Pay with Card'}
                </button>
              </form>
              
              {paymentStatus && (
                <div className={`payment-status ${isProcessing || isVerifying ? 'processing' : ''}`}>
                  {paymentStatus}
                </div>
              )}

              {paymentReference && paymentFormData.paymentMethod === 'momo' && (
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
          )}
        </div>

        <div className="modal-footer">
          {step > 1 && (
            <button 
              className="back-button"
              onClick={() => setStep(step - 1)}
            >
              Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookingModal; 