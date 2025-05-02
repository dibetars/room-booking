
class ExchangeRateService {
  private static instance: ExchangeRateService;
  private readonly API_KEY = import.meta.env.VITE_EXCHANGE_RATE_API_KEY;
  private readonly API_URL = 'https://v6.exchangerate-api.com/v6';
  private currentRate: number = 14.3; // Default fallback rate
  private lastUpdate: number = 0;
  private readonly UPDATE_INTERVAL = 3600000; // 1 hour in milliseconds

  private constructor() {
    this.updateRate();
  }

  public static getInstance(): ExchangeRateService {
    if (!ExchangeRateService.instance) {
      ExchangeRateService.instance = new ExchangeRateService();
    }
    return ExchangeRateService.instance;
  }

  private async updateRate() {
    try {
      const response = await fetch(`${this.API_URL}/${this.API_KEY}/pair/USD/GHS`);
      const data = await response.json();
      
      if (data.result === 'success') {
        this.currentRate = data.conversion_rate;
        this.lastUpdate = Date.now();
      }
    } catch (error) {
      console.error('Error updating exchange rate:', error);
    }
  }

  public getCurrentRate(): number {
    const now = Date.now();
    if (now - this.lastUpdate > this.UPDATE_INTERVAL) {
      this.updateRate();
    }
    return this.currentRate;
  }

  public async convertUSDToGHS(usdAmount: number): Promise<number> {
    return usdAmount * this.currentRate;
  }
}

export default ExchangeRateService; 