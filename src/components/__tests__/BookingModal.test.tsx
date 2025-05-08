import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookingModal from '../BookingModal';
import PaymentService from '../../services/paymentService';
import ExchangeRateService from '../../services/exchangeRateService';

// Mock the services
jest.mock('../../services/paymentService');
jest.mock('../../services/exchangeRateService');

describe('BookingModal', () => {
  const mockOnClose = jest.fn();
  const mockExchangeRate = 14.3;
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    
    // Mock ExchangeRateService
    (ExchangeRateService.getInstance as jest.Mock).mockReturnValue({
      getCurrentRate: () => mockExchangeRate
    });
    
    // Mock PaymentService
    (PaymentService.getInstance as jest.Mock).mockReturnValue({
      initiateMobileMoneyPayment: jest.fn(),
      initiateCardPayment: jest.fn(),
      verifyPayment: jest.fn()
    });
  });

  // Test Case 1: Initial Render
  it('renders the availability check form initially', () => {
    render(<BookingModal isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByLabelText(/arrival date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/departure date/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /check availability/i })).toBeInTheDocument();
  });

  // Test Case 2: Date Validation
  it('prevents selecting departure date before arrival date', async () => {
    render(<BookingModal isOpen={true} onClose={mockOnClose} />);
    
    const arrivalInput = screen.getByLabelText(/arrival date/i);
    const departureInput = screen.getByLabelText(/departure date/i);
    
    // Set arrival date
    await userEvent.type(arrivalInput, '2024-04-01');
    
    // Try to set departure date before arrival
    await userEvent.type(departureInput, '2024-03-31');
    
    expect(departureInput).toHaveAttribute('min', '2024-04-01');
  });

  // Test Case 3: Availability Check
  it('handles availability check and displays available rooms', async () => {
    const mockRooms = [
      {
        id: 2634263,
        name: 'Room 1',
        price: 35,
        currency: '$',
        available: true
      }
    ];

    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({
        availableApartments: [2634263],
        prices: {
          2634263: { price: 35, currency: '$' }
        }
      })
    });

    render(<BookingModal isOpen={true} onClose={mockOnClose} />);
    
    // Fill in dates
    await userEvent.type(screen.getByLabelText(/arrival date/i), '2024-04-01');
    await userEvent.type(screen.getByLabelText(/departure date/i), '2024-04-03');
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /check availability/i }));
    
    // Wait for rooms to be displayed
    await waitFor(() => {
      expect(screen.getByText('Room 1')).toBeInTheDocument();
    });
  });

  // Test Case 4: Room Selection
  it('allows selecting a room and proceeds to payment', async () => {
    // Mock the availability check response
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({
        availableApartments: [2634263],
        prices: {
          2634263: { price: 35, currency: '$' }
        }
      })
    });

    render(<BookingModal isOpen={true} onClose={mockOnClose} />);
    
    // Fill in dates and check availability
    await userEvent.type(screen.getByLabelText(/arrival date/i), '2024-04-01');
    await userEvent.type(screen.getByLabelText(/departure date/i), '2024-04-03');
    fireEvent.click(screen.getByRole('button', { name: /check availability/i }));
    
    // Wait for and select a room
    await waitFor(() => {
      expect(screen.getByText('Room 1')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole('button', { name: /book now/i }));
    
    // Verify payment form is displayed
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  // Test Case 5: Mobile Money Payment
  it('handles mobile money payment submission', async () => {
    const mockPaymentResponse = {
      status: true,
      data: {
        reference: 'test-ref-123',
        status: 'pending'
      }
    };

    (PaymentService.getInstance as jest.Mock).mockReturnValue({
      initiateMobileMoneyPayment: jest.fn().mockResolvedValue(mockPaymentResponse),
      verifyPayment: jest.fn()
    });

    // Mock the availability check and room selection
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({
        availableApartments: [2634263],
        prices: {
          2634263: { price: 35, currency: '$' }
        }
      })
    });

    render(<BookingModal isOpen={true} onClose={mockOnClose} />);
    
    // Go through the booking flow
    await userEvent.type(screen.getByLabelText(/arrival date/i), '2024-04-01');
    await userEvent.type(screen.getByLabelText(/departure date/i), '2024-04-03');
    fireEvent.click(screen.getByRole('button', { name: /check availability/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Room 1')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole('button', { name: /book now/i }));
    
    // Fill in payment details
    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/phone number/i), '0244123456');
    
    // Submit payment
    fireEvent.click(screen.getByRole('button', { name: /pay with mobile money/i }));
    
    // Verify payment initiation
    await waitFor(() => {
      expect(screen.getByText(/payment initiated/i)).toBeInTheDocument();
    });
  });

  // Test Case 6: Card Payment
  it('handles card payment submission', async () => {
    const mockPaymentResponse = {
      status: true,
      data: {
        authorization_url: 'https://checkout.paystack.com/test'
      }
    };

    (PaymentService.getInstance as jest.Mock).mockReturnValue({
      initiateCardPayment: jest.fn().mockResolvedValue(mockPaymentResponse)
    });

    // Mock the availability check and room selection
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({
        availableApartments: [2634263],
        prices: {
          2634263: { price: 35, currency: '$' }
        }
      })
    });

    render(<BookingModal isOpen={true} onClose={mockOnClose} />);
    
    // Go through the booking flow
    await userEvent.type(screen.getByLabelText(/arrival date/i), '2024-04-01');
    await userEvent.type(screen.getByLabelText(/departure date/i), '2024-04-03');
    fireEvent.click(screen.getByRole('button', { name: /check availability/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Room 1')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole('button', { name: /book now/i }));
    
    // Switch to card payment
    fireEvent.click(screen.getByRole('button', { name: /card payment/i }));
    
    // Fill in payment details
    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    
    // Submit payment
    fireEvent.click(screen.getByRole('button', { name: /pay with card/i }));
    
    // Verify payment initiation
    await waitFor(() => {
      expect(PaymentService.getInstance().initiateCardPayment).toHaveBeenCalled();
    });
  });

  // Test Case 7: Error Handling
  it('displays error message when availability check fails', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

    render(<BookingModal isOpen={true} onClose={mockOnClose} />);
    
    // Fill in dates
    await userEvent.type(screen.getByLabelText(/arrival date/i), '2024-04-01');
    await userEvent.type(screen.getByLabelText(/departure date/i), '2024-04-03');
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /check availability/i }));
    
    // Verify error message
    await waitFor(() => {
      expect(screen.getByText(/failed to check availability/i)).toBeInTheDocument();
    });
  });

  // Test Case 8: Payment Verification
  it('handles payment verification', async () => {
    const mockVerifyResponse = {
      data: {
        status: 'success',
        amount: 5000
      }
    };

    (PaymentService.getInstance as jest.Mock).mockReturnValue({
      initiateMobileMoneyPayment: jest.fn().mockResolvedValue({
        status: true,
        data: { reference: 'test-ref-123' }
      }),
      verifyPayment: jest.fn().mockResolvedValue(mockVerifyResponse)
    });

    // Mock the availability check and room selection
    global.fetch = jest.fn().mockResolvedValue({
      json: () => Promise.resolve({
        availableApartments: [2634263],
        prices: {
          2634263: { price: 35, currency: '$' }
        }
      })
    });

    render(<BookingModal isOpen={true} onClose={mockOnClose} />);
    
    // Go through the booking flow
    await userEvent.type(screen.getByLabelText(/arrival date/i), '2024-04-01');
    await userEvent.type(screen.getByLabelText(/departure date/i), '2024-04-03');
    fireEvent.click(screen.getByRole('button', { name: /check availability/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Room 1')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole('button', { name: /book now/i }));
    
    // Fill in payment details and submit
    await userEvent.type(screen.getByLabelText(/email/i), 'test@example.com');
    await userEvent.type(screen.getByLabelText(/phone number/i), '0244123456');
    fireEvent.click(screen.getByRole('button', { name: /pay with mobile money/i }));
    
    // Verify payment
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /verify payment/i })).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByRole('button', { name: /verify payment/i }));
    
    // Verify success message
    await waitFor(() => {
      expect(screen.getByText(/payment successful/i)).toBeInTheDocument();
    });
  });
}); 