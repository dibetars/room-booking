import axios from 'axios';

interface MobileMoneyPayment {
  email: string;
  amount: number;
  mobile_money: {
    phone: string;
    provider: 'vod' | 'mtn' | 'atl';
  };
}

interface CardPayment {
  email: string;
  amount: number;
  card: {
    number: string;
    cvv: string;
    expiry_month: string;
    expiry_year: string;
  };
}

interface PaymentResponse {
  status: boolean;
  message: string;
  data: {
    reference: string;
    status: string;
    gateway_response: string;
    authorization_url?: string;
  };
}

class PaymentService {
  private static instance: PaymentService;
  private readonly PAYSTACK_SECRET_KEY = import.meta.env.VITE_PAYSTACK_SECRET_KEY;
  private readonly PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
  private readonly PAYSTACK_API_URL = 'https://api.paystack.co';

  private constructor() {}

  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  public async initiateMobileMoneyPayment(
    email: string,
    amount: number,
    phone: string,
    provider: 'vod' | 'mtn' | 'atl'
  ): Promise<PaymentResponse> {
    try {
      const paymentData: MobileMoneyPayment = {
        email,
        amount: Math.round(amount * 100), // Convert to pesewas
        mobile_money: {
          phone,
          provider
        }
      };

      const response = await axios.post(
        `${this.PAYSTACK_API_URL}/charge`,
        paymentData,
        {
          headers: {
            'Authorization': `Bearer ${this.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Payment initiation error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Payment initiation failed');
    }
  }

  public async initiateCardPayment(
    email: string,
    amount: number,
    card: {
      number: string;
      cvv: string;
      expiry_month: string;
      expiry_year: string;
    }
  ): Promise<PaymentResponse> {
    try {
      const paymentData: CardPayment = {
        email,
        amount: Math.round(amount * 100), // Convert to pesewas
        card
      };

      const response = await axios.post(
        `${this.PAYSTACK_API_URL}/charge`,
        paymentData,
        {
          headers: {
            'Authorization': `Bearer ${this.PAYSTACK_SECRET_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Card payment initiation error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Card payment initiation failed');
    }
  }

  public async verifyPayment(reference: string): Promise<PaymentResponse> {
    try {
      const response = await axios.get(
        `${this.PAYSTACK_API_URL}/transaction/verify/${reference}`,
        {
          headers: {
            'Authorization': `Bearer ${this.PAYSTACK_SECRET_KEY}`
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Payment verification error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Payment verification failed');
    }
  }

  public getPublicKey(): string {
    return this.PAYSTACK_PUBLIC_KEY;
  }
}

export default PaymentService; 