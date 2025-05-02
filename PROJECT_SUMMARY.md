# Room Booking Project Summary

## Project Overview
A React-based room booking application that integrates Smoobu for room management and Paystack for payment processing in Ghana Cedis (GHS). The application provides a seamless booking experience with a three-step process: availability check, room selection, and payment processing. The website features a modern, eco-friendly design that reflects BokoBoko's commitment to sustainability.

## Technical Stack
- **Frontend**: React with TypeScript
- **Build Tool**: Vite
- **Payment Gateway**: Paystack (Direct Charge API for Mobile Money and Card Payments)
- **Booking System**: Smoobu
- **Currency**: Ghana Cedis (GHS) with live exchange rate
- **Backend**: Express.js with Node.js
- **Styling**: CSS with custom animations
- **Font**: DM Sans (Google Fonts)
- **Icons**: Font Awesome 6.5.1

## Project Structure
```
src/
├── components/
│   ├── Layout.tsx
│   ├── Layout.css
│   ├── BookingModal.tsx
│   ├── BookingModal.css
│   ├── Home.tsx
│   ├── Home.css
│   ├── Footer.tsx
│   └── Footer.css
├── services/
│   ├── exchangeRateService.ts
│   └── paymentService.ts
├── App.tsx
├── App.css
└── main.tsx
server/
├── index.js
└── .env
public/
├── images/
│   ├── Boko-Logo.png
│   ├── kitchen.jpg
│   ├── agro.jpg
│   ├── farm.jpg
│   ├── local.jpg
│   ├── cultural.jpg
│   ├── cape.jpg
│   ├── surf.jpg
│   ├── Bgsec4.jpg
│   ├── terra.jpg
│   └── rooms/
│       ├── StandardRoom.jpg
│       ├── DeluxeRoom.jpg
│       └── FamilyRoom.jpg
└── videos/
    └── hero-background.mp4
```

## Key Components

### 1. Layout Component
- Transparent navbar with scroll effect
- Large logo (80px height on desktop, 70px on mobile)
- Responsive navigation
- Dynamic background color on scroll
- Sticky positioning

### 2. Home Component
- Hero section with video background
- Starlink announcement section
- About section with image and text
- Rooms section with card layout
- Amenities section with interactive cards
- Contact section with booking integration and terra.jpg background

### 3. BookingModal Component
- Three-step booking process:
  1. Availability Check
  2. Room Selection
  3. Payment Processing
- Features:
  - Dynamic room availability checking
  - Grid/List view toggle for rooms
  - Three-column grid layout for room display
  - Responsive grid (3 columns on desktop, 2 on tablet, 1 on mobile)
  - Detailed room information display
  - Live exchange rate conversion
  - Paystack integration for both mobile money and card payments
  - Three-column payment form layout
  - Real-time payment status updates

### 4. Footer Component
- Clean, modern design
- Three-column layout
- Contact information
- Quick links
- Social media links
- Copyright notice
- Responsive design

## Implemented Features

### 1. UI/UX Features
- Modern, responsive design with DM Sans font
- Interactive card animations
- Video background with overlay
- Transparent navbar with scroll effect
- Image-based amenity cards with fade effect
- Responsive grid layouts
- Custom button styles
- Smooth transitions and animations
- Font Awesome social media icons
- Enhanced logo visibility
- Three-column payment form layout
- Background image integration (Bgsec4.jpg, terra.jpg)

### 2. Amenities Section
- Interactive card layout with:
  - Full-height image backgrounds
  - Text overlay with gradient
  - Fade animation on hover
  - Responsive grid system
  - Custom content for each amenity:
    1. Rooftop Terrace
    2. Kitchenette
    3. Agritourism
    4. Farm-to-Table
    5. Local Brews
    6. Cultural Experiences
    7. Cape Coast Journey
    8. Surfing

### 3. Room Management
- Specific room IDs and pricing:
  - Standard Rooms ($30):
    - Room 3a (2634338)
    - Room 3b (2634343)
    - Room 4 (2509563)
    - Room 6 (2509573)
  - Deluxe Rooms with AC ($35):
    - Room 1 (2634263)
    - Room 2 (2509568)
  - Family Rooms ($40):
    - Room 3 (2644078)
    - Room 5 (2509578)
- Room details display including:
  - Location information
  - Room configuration
  - Equipment list
  - Amenities
- Three-column grid layout for room display
- Responsive grid adjustments:
  - Desktop: 3 columns
  - Tablet: 2 columns
  - Mobile: 1 column

### 4. Currency Conversion
- Live exchange rate system using ExchangeRate-API:
  - Real-time USD/GHS conversion
  - Automatic rate updates every hour
  - Fallback rate mechanism
  - Caching system to prevent excessive API calls
  - Error handling and logging

### 5. Payment Processing
- Paystack integration:
  - Mobile money payment support:
    - Vodafone Cash (vod)
    - MTN Mobile Money (mtn)
    - AirtelTigo Money (atl)
  - Card payment support
  - Payment flow:
    1. User enters email
    2. Selects payment method (Mobile Money/Card)
    3. For Mobile Money:
       - Enters phone number
       - Selects provider
       - Receives payment prompt
    4. For Card:
       - Paystack popup for secure processing
    5. System polls for payment status
    6. Automatic confirmation on success
  - Features:
    - Real-time payment status updates
    - Error handling and user feedback
    - Payment verification
    - Automatic modal closure on success
    - 5-minute payment timeout
    - Detailed error messages
    - Three-column payment form layout

## Technical Implementation

### Styling Implementation
```css
:root {
  --main-color: #BE6A45;
  --button-color: #000000;
  --text-color: #333333;
  --background-light: #f9f9f9;
  --section2-color: #85A8AE;
  --white: #ffffff;
  --font-family: 'DM Sans', sans-serif;
}
```
- Custom CSS variables for consistent theming
- Responsive design breakpoints
- Modern animation effects
- Gradient overlays
- Card hover effects
- Enhanced logo sizing
- Three-column grid system
- Background image integration

### Paystack Integration
```typescript
// Payment Service Implementation
class PaymentService {
  private readonly PAYSTACK_SECRET_KEY = 'sk_live_ee13d5a26dc8668ae9b2ed4531d577576426c5e6';
  private readonly PAYSTACK_API_URL = 'https://api.paystack.co';
  
  // Mobile money payment initiation
  public async initiateMobileMoneyPayment(
    email: string,
    amount: number,
    phone: string,
    provider: 'vod' | 'mtn' | 'atl'
  ): Promise<PaymentResponse>
  
  // Card payment initiation
  public async initiateCardPayment(
    email: string,
    amount: number
  ): Promise<PaymentResponse>
  
  // Payment verification
  public async verifyPayment(reference: string): Promise<PaymentResponse>
}
```
- Direct Charge API integration
- Mobile money provider support
- Card payment support
- Payment status polling
- Error handling and logging
- Type safety with TypeScript

### Smoobu Integration
- Custom availability check endpoint
- Room details endpoint
- API key management
- Error handling and logging

### Backend API Endpoints
```javascript
// Availability Check
POST /api/check-availability

// Room Details
GET /api/room-details/:apartmentId
```

## Security Features
- Environment variables for sensitive data
- CORS configuration
- API key protection
- Secure payment processing
- Payment verification
- Rate limiting
- Error logging

## Next Steps
1. **Enhanced Features**
   - Email notifications
   - Booking management
   - User authentication
   - Booking history
   - Image optimization
   - Video compression

2. **UI/UX Improvements**
   - Additional loading states
   - Enhanced error handling
   - Success/failure notifications
   - Mobile responsiveness optimization
   - Performance optimization
   - Accessibility improvements

3. **Testing**
   - Unit tests
   - Integration tests
   - Payment flow testing
   - Cross-browser testing
   - Mobile device testing
   - Performance testing

4. **Security Enhancements**
   - Input validation
   - CSRF protection
   - Rate limiting
   - Payment verification
   - Image security
   - Video streaming optimization

## Dependencies
```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "axios": "^1.6.0",
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "typescript": "~5.7.2",
    "vite": "^6.3.1"
  }
}
```

## Environment Setup
Required environment variables:
- `SMOOBU_API_KEY`: Smoobu API key
- `PORT`: Server port (default: 3001)
- `PAYSTACK_SECRET_KEY`: Paystack secret key
- `EXCHANGE_RATE_API_KEY`: ExchangeRate-API key

## Getting Started
1. Clone the repository
2. Install dependencies: `npm install`
3. Create `.env` file in server directory
4. Start development server: `npm run dev`
5. Build for production: `npm run build`

## Important Notes
- Exchange rate updates automatically every hour
- Room prices are in USD but displayed in both USD and GHS
- Payment processing is in GHS (converted from USD)
- Mobile money payments require phone number and provider selection
- Card payments use Paystack's secure iframe
- Payment status is polled every 5 seconds
- Payment timeout after 5 minutes
- Navbar logo is 80px tall on desktop and 70px on mobile
- Contact section uses terra.jpg as background
- Payment form uses three-column layout 