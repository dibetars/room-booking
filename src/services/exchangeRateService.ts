import axios from 'axios';

interface ExchangeRateResponse {
  rate: number;
  lastUpdated: string;
}

class ExchangeRateService {
  private static instance: ExchangeRateService;
  private currentRate: number = 14.3; // Fallback rate
  private lastUpdated: Date = new Date();
  private cacheDuration: number = 1000 * 60 * 60; // 1 hour cache

  private constructor() {
    this.fetchExchangeRate();
    // Update rate every hour
    setInterval(() => this.fetchExchangeRate(), this.cacheDuration);
  }

  public static getInstance(): ExchangeRateService {
    if (!ExchangeRateService.instance) {
      ExchangeRateService.instance = new ExchangeRateService();
    }
    return ExchangeRateService.instance;
  }

  private async fetchExchangeRate(): Promise<void> {
    try {
      // Using ExchangeRate-API
      const response = await axios.get(
        `https://v6.exchangerate-api.com/v6/f64ee8e437de8f60b400f5d5/pair/USD/GHS`
      );

      if (response.data && response.data.conversion_rate) {
        this.currentRate = response.data.conversion_rate;
        this.lastUpdated = new Date();
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      // Fallback to the last known rate
    }
  }

  public getCurrentRate(): number {
    return this.currentRate;
  }

  public getLastUpdated(): Date {
    return this.lastUpdated;
  }

  public async convertUSDToGHS(usdAmount: number): Promise<number> {
    return usdAmount * this.currentRate;
  }
}

export default ExchangeRateService; 