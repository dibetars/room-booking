'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Script from 'next/script';
import { ROOMS } from '@/lib/rooms';


const GHS_PER_USD = Number(process.env.NEXT_PUBLIC_GHS_PER_USD ?? '15.5');
const toGHS = (usd: number) => Math.round(usd * GHS_PER_USD);

function todayStr() { return new Date().toISOString().slice(0, 10); }
function tomorrowStr() {
  const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10);
}

interface RoomResult {
  roomId: number;
  name: string;
  description: string;
  maxOccupancy: number;
  photos: string[];
  available: boolean;
  totalPriceGHS: number;
  perNight: number;
}

// Derive category starting prices — sorted distinct rack rates map to Standard / Deluxe / Family
const [standardUSD, deluxeUSD, familyUSD] = [...new Set(ROOMS.map(r => r.rackRateUSD))].sort((a, b) => a - b);

const ROOM_CATEGORIES = [
  { img: '/images/rooms/StandardRoom.jpg', title: 'Standard Room', names: 'Generosity, Love, Humility & Wisdom', usd: standardUSD,
    desc: 'Ensuite bathrooms with access to shared rooftop terrace, kitchenette, farm-to-table dining, bar, and more.' },
  { img: '/images/rooms/DeluxeRoom.jpg', title: 'Deluxe Room', names: 'Patience & Regeneration', usd: deluxeUSD,
    desc: 'Air conditioning, natural materials, and energy-efficient lighting. Perfect for couples or solo travellers.' },
  { img: '/images/rooms/FamilyRoom.jpg', title: 'Family Room', names: 'Truth & Honesty', usd: familyUSD,
    desc: 'Spacious retreat for families to connect and unwind with full access to all shared amenities.' },
];

export default function HomePage() {
  const [scrolled, setScrolled] = useState(false);
  const [checkIn, setCheckIn] = useState(todayStr());
  const [checkOut, setCheckOut] = useState(tomorrowStr());
  const [adults, setAdults] = useState('2');
  const [children, setChildren] = useState('0');

  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<RoomResult[] | null>(null);
  const [searchError, setSearchError] = useState('');

  // Checkout modal state
  const [selectedRoom, setSelectedRoom] = useState<RoomResult | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState('');

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearching(true);
    setSearchError('');
    setResults(null);

    try {
      const qs = new URLSearchParams({ checkIn, checkOut, adults, children });
      const res = await fetch(`/api/availability?${qs}`);
      const data = await res.json();
      if (!res.ok) { setSearchError(data.error ?? 'Failed to check availability.'); return; }
      setResults(data.rooms ?? []);
    } catch {
      setSearchError('Network error. Please check your connection and try again.');
    } finally {
      setSearching(false);
    }
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRoom) return;
    setBookingError('');
    setSubmitting(true);

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: selectedRoom.roomId,
          checkIn, checkOut,
          adults: Number(adults), children: Number(children),
          guest: { name, email, phone: phone || undefined },
        }),
      });

      const data = await res.json();
      if (!res.ok) { setBookingError(data.error ?? 'Booking failed. Please try again.'); setSubmitting(false); return; }

      const { reference, amountPesewas } = data;
      const paystackKey = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ?? '';

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handler = (window as any).PaystackPop.setup({
        key: paystackKey,
        email,
        amount: amountPesewas,
        currency: 'GHS',
        ref: reference,
        channels: ['card', 'mobile_money'],
        onClose() {
          setBookingError('Payment cancelled. You can try again.');
          setSubmitting(false);
        },
        callback(response: { reference: string }) {
          window.location.href = `/confirm/${response.reference}`;
        },
      });

      handler.openIframe();
    } catch {
      setBookingError('Network error. Please check your connection and try again.');
      setSubmitting(false);
    }
  }

  const nights = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000);
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-GH', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="font-sans text-[#333]">
      <Script src="https://js.paystack.co/v1/inline.js" strategy="beforeInteractive" />

      {/* Navbar */}
      <nav className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white/95 shadow-md h-20' : 'bg-transparent h-24'}`}>
        <div className="max-w-6xl mx-auto px-5 h-full flex items-center justify-between">
          <a href="/" className="h-14 flex items-center">
            <Image src="/images/Boko-Logo.png" alt="BokoBoko" width={120} height={56}
              className={`h-14 w-auto object-contain transition-all ${scrolled ? 'brightness-0' : ''}`} />
          </a>
          <div className="hidden md:flex items-center gap-8">
            {['About', 'Rooms', 'Amenities', 'Contact'].map((s) => (
              <a key={s} href={`#${s.toLowerCase()}`}
                className={`font-medium transition-colors hover:text-[#BE6A45] ${scrolled ? 'text-[#333]' : 'text-white'}`}>{s}</a>
            ))}
            <a href="#search" className="bg-black text-white px-5 py-2.5 rounded-full font-semibold hover:bg-[#BE6A45] transition-colors">
              Book Now
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative h-screen min-h-[650px] flex flex-col items-center justify-center text-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <video autoPlay muted loop playsInline className="w-full h-full object-cover">
            <source src="/videos/hero-background.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/40 to-black/70" />
        </div>

        <div className="relative z-10 text-center px-4 mb-10 mt-16">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold max-w-3xl leading-tight drop-shadow-lg">
            Eco-Friendly Accommodation Built with Sustainable Comfort in Mind
          </h1>
        </div>

        {/* Booking widget */}
        <div id="search" className="relative z-10 w-full max-w-4xl px-4">
          <form onSubmit={handleSearch}
            className="bg-white rounded-2xl shadow-2xl p-4 md:p-5 flex flex-col md:flex-row items-stretch md:items-end gap-3">
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Check-in</label>
              <input type="date" value={checkIn} min={todayStr()} required
                onChange={e => setCheckIn(e.target.value)}
                className="w-full text-gray-800 font-medium text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#BE6A45]" />
            </div>
            <div className="flex-1 min-w-0">
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Check-out</label>
              <input type="date" value={checkOut} min={checkIn} required
                onChange={e => setCheckOut(e.target.value)}
                className="w-full text-gray-800 font-medium text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#BE6A45]" />
            </div>
            <div className="flex gap-3 md:contents">
              <div className="flex-1 md:w-28 md:shrink-0">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Adults</label>
                <select value={adults} onChange={e => setAdults(e.target.value)}
                  className="w-full text-gray-800 font-medium text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#BE6A45]">
                  {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="flex-1 md:w-28 md:shrink-0">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Children</label>
                <select value={children} onChange={e => setChildren(e.target.value)}
                  className="w-full text-gray-800 font-medium text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#BE6A45]">
                  {[0,1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <button type="submit" disabled={searching}
              className="w-full md:w-auto bg-[#BE6A45] hover:bg-[#a85a38] text-white font-bold px-8 py-3 rounded-xl transition-colors whitespace-nowrap shrink-0 disabled:opacity-70">
              {searching ? 'Searching…' : 'Search Rooms'}
            </button>
          </form>
        </div>
      </section>

      {/* Availability Results Modal */}
      {(results !== null || searchError) && !selectedRoom && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="text-xl font-bold text-[#333]">Available Rooms</h2>
                {results !== null && (
                  <p className="text-gray-500 text-sm mt-0.5">
                    {fmt(checkIn)} → {fmt(checkOut)} · {nights} night{nights !== 1 ? 's' : ''} · {adults} adult{Number(adults) !== 1 ? 's' : ''}{Number(children) > 0 ? `, ${children} child${Number(children) !== 1 ? 'ren' : ''}` : ''}
                  </p>
                )}
              </div>
              <button onClick={() => { setResults(null); setSearchError(''); }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none ml-4">&times;</button>
            </div>

            <div className="overflow-y-auto p-6">
              {searchError && <p className="text-red-600 text-center">{searchError}</p>}
              {results !== null && results.filter(r => r.available).length === 0 && (
                <p className="text-gray-500 text-center py-8">No rooms available for those dates. Please try different dates.</p>
              )}
              {results !== null && results.filter(r => r.available).length > 0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {results.filter(r => r.available).map(room => {
                    const perNightUSD = Math.round(room.perNight / GHS_PER_USD);
                    const totalUSD = perNightUSD * nights;
                    return (
                      <div key={room.roomId} className="bg-[#f9f9f9] rounded-2xl overflow-hidden flex flex-col">
                        <div className="aspect-[4/3] relative">
                          <Image src={room.photos[0] ?? '/images/rooms/StandardRoom.jpg'} alt={room.name} fill className="object-cover" />
                        </div>
                        <div className="p-4 flex flex-col flex-1">
                          <h3 className="text-base font-bold text-[#333] mb-1">{room.name}</h3>
                          <p className="text-gray-500 text-xs leading-relaxed mb-2 flex-1">{room.description}</p>
                          <p className="text-xs text-gray-400 mb-2">Up to {room.maxOccupancy} guests</p>
                          <div className="mb-3">
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-lg font-bold text-[#BE6A45]">${perNightUSD}</span>
                              <span className="text-gray-400 text-xs">/ night</span>
                            </div>
                            <p className="text-xs font-semibold text-gray-700 mt-0.5">
                              Total: ${totalUSD}
                            </p>
                          </div>
                          <button onClick={() => { setSelectedRoom(room); setBookingError(''); }}
                            className="w-full bg-black text-white font-semibold py-2 rounded-xl hover:bg-[#BE6A45] transition-colors text-sm">
                            Select Room
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {selectedRoom && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-800">Complete Booking</h2>
                <button onClick={() => { setSelectedRoom(null); setBookingError(''); setSubmitting(false); }}
                  className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
              </div>

              {/* Summary */}
              <div className="bg-[#f5f0e8] rounded-xl p-4 space-y-1">
                <p className="font-semibold text-gray-800">{selectedRoom.name}</p>
                <p className="text-sm text-gray-500">{fmt(checkIn)} → {fmt(checkOut)} · {nights} night{nights !== 1 ? 's' : ''}</p>
                <div className="flex justify-between items-baseline mt-2">
                  <span className="text-sm text-gray-500">${Math.round(selectedRoom.perNight / GHS_PER_USD)} × {nights} night{nights !== 1 ? 's' : ''}</span>
                  <span className="font-bold text-[#BE6A45]">${Math.round(selectedRoom.totalPriceGHS / GHS_PER_USD)}</span>
                </div>
              </div>

              {/* Guest form */}
              <form onSubmit={handleBook} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Full name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Kwame Mensah"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#BE6A45]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="kwame@example.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#BE6A45]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Phone (for MoMo confirmation)</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="024 000 0000"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#BE6A45]" />
                </div>

                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-2 font-medium">Accepted payment methods</p>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="bg-[#ffcc00] text-black px-2 py-1 rounded">MTN MoMo</span>
                    <span className="bg-[#e40087] text-white px-2 py-1 rounded">Telecel Cash</span>
                    <span className="bg-[#00539b] text-white px-2 py-1 rounded">AT Money</span>
                    <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded">Visa / Mastercard</span>
                  </div>
                </div>

                {bookingError && <p className="text-red-600 text-sm">{bookingError}</p>}

                <button type="submit" disabled={submitting}
                  className="w-full bg-[#BE6A45] hover:bg-[#a85a38] text-white font-bold py-3 rounded-xl transition-colors disabled:opacity-60">
                  {submitting ? 'Opening payment…' : `Pay $${Math.round(selectedRoom.totalPriceGHS / GHS_PER_USD)}`}
                </button>
                <p className="text-xs text-gray-400 text-center">Secure payment powered by Paystack.</p>
              </form>
            </div>
          </div>
        </div>
      )}


      {/* About */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-5 grid md:grid-cols-2 gap-12 items-center">
          <div className="rounded-2xl overflow-hidden shadow-lg aspect-[4/3] relative">
            <Image src="/images/about-image.jpg" alt="BokoBoko" fill className="object-cover" />
          </div>
          <div>
            <h2 className="text-3xl font-bold text-[#333] mb-5 leading-tight">
              Living in harmony with nature is not just a philosophy.
            </h2>
            <p className="text-gray-600 leading-relaxed mb-6">
              At BokoBoko, living with nature is our way of life. Many of the ingredients for our meals
              are nurtured in our garden. Our guesthouse is crafted using sustainable construction
              techniques, and all profits are redirected into OPC — the NGO that brought BokoBoko to life.
            </p>
            <a href="#search" className="inline-block bg-black text-white font-semibold px-7 py-3 rounded-full hover:bg-[#BE6A45] transition-colors">
              Book Now
            </a>
          </div>
        </div>
      </section>

      {/* Rooms */}
      <section id="rooms" className="py-20 bg-[#f9f9f9]">
        <div className="max-w-6xl mx-auto px-5">
          <h2 className="text-3xl font-bold text-center text-[#333] mb-12">
            Guaranteed sustainable living without compromising comfort
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            {ROOM_CATEGORIES.map(({ img, title, names, usd, desc }) => (
              <div key={title} className="bg-white rounded-2xl shadow-md overflow-hidden flex flex-col">
                <div className="aspect-[4/3] relative">
                  <Image src={img} alt={title} fill className="object-cover" />
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <p className="text-xs text-[#BE6A45] font-semibold uppercase tracking-wide mb-1">{names}</p>
                  <h3 className="text-xl font-bold text-[#333] mb-2">{title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed mb-4 flex-1">{desc}</p>
                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-2xl font-bold text-[#BE6A45]">${usd}</span>
                    <span className="text-gray-400 text-sm">/ night</span>
                  </div>
                  <a href="#search" className="block text-center bg-black text-white font-semibold px-5 py-2.5 rounded-full hover:bg-[#BE6A45] transition-colors">
                    Book Now
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Amenities */}
      <section id="amenities" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-5">
          <h2 className="text-3xl font-bold text-center text-[#333] mb-12">We offer to our guests</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Row 1: 2/3 + 1/3 */}
            {[
              { img: '/images/rooftop.jpg', title: 'Rooftop Terrace', desc: 'Experience calm relaxation atop our rooftop terrace with panoramic views of the surrounding eco village and mountain ranges. Whether you\'re stargazing under the night sky or basking in the warmth of the sun, this rooftop oasis offers a sanctuary to unwind and connect with nature.', wide: true },
              { img: '/images/kitchen.jpg', title: 'Kitchenette', desc: 'For guests craving the comforts of home or wishing to explore their culinary creativity, our guest house features a convenient kitchenette. Stocked with essential cookware, utensils, and appliances, this communal space invites guests to prepare their own meals using locally sourced ingredients.', wide: false },
            ].map(({ img, title, desc, wide }) => (
              <div key={title} className={`group relative rounded-2xl overflow-hidden h-80 ${wide ? 'lg:col-span-2' : ''}`}>
                <Image src={img} alt={title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/65 transition-colors flex flex-col justify-end p-5">
                  <h3 className="text-white font-bold text-sm leading-tight">{title}</h3>
                  <p className="opacity-0 max-h-0 overflow-hidden group-hover:opacity-100 group-hover:max-h-40 text-white/90 text-sm mt-1 transition-all duration-300 leading-snug">{desc}</p>
                </div>
              </div>
            ))}

            {/* Row 2: 1/3 + 1/3 + 1/3 */}
            {[
              { img: '/images/farm.jpg', title: 'Farm-to-Table Breakfast', desc: 'Start your day with a delicious breakfast made from fresh, organic ingredients sourced directly from our garden and local farmers. Experience the true taste of farm-to-table dining.' },
              { img: '/images/local.jpg', title: 'Local Brews and Beyond', desc: 'Our bar features a selection of local brews crafted by nearby artisans. Enjoy refreshing drinks while soaking in the vibrant atmosphere of our eco-friendly space.' },
              { img: '/images/agro.jpg', title: 'Agritourism and Beyond', desc: 'Immerse yourself in the rhythms of rural life with hands-on experiences in organic farming, traditional crafts, and cultural exchanges. Connect with the land and local community.' },
            ].map(({ img, title, desc }) => (
              <div key={title} className="group relative rounded-2xl overflow-hidden h-64">
                <Image src={img} alt={title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/65 transition-colors flex flex-col justify-end p-5">
                  <h3 className="text-white font-bold text-sm leading-tight">{title}</h3>
                  <p className="opacity-0 max-h-0 overflow-hidden group-hover:opacity-100 group-hover:max-h-40 text-white/90 text-xs mt-1 transition-all duration-300 leading-snug">{desc}</p>
                </div>
              </div>
            ))}

            {/* Row 3: 1/3 + 1/3 + 1/3 */}
            {[
              { img: '/images/cultural.jpg', title: 'Cultural Experiences', desc: 'Immerse yourself in the rich traditions of West African hospitality and culture. Participate in local customs, music, and art that make your stay truly memorable.' },
              { img: '/images/cape.jpg', title: 'Cape Coast saw you first!', desc: "Embark on a historical journey through Ghana's Central Region. Explore the rich heritage and stunning landscapes that make this area unique." },
              { img: '/images/surf.jpg', title: 'Surf Lessons & Hiking', desc: 'Experience the thrill of surfing with lessons from our partner local surf schools. Whether a beginner or experienced surfer, enjoy the perfect waves of our coastal location.' },
            ].map(({ img, title, desc }) => (
              <div key={title} className="group relative rounded-2xl overflow-hidden h-64">
                <Image src={img} alt={title} fill className="object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/65 transition-colors flex flex-col justify-end p-5">
                  <h3 className="text-white font-bold text-sm leading-tight">{title}</h3>
                  <p className="opacity-0 max-h-0 overflow-hidden group-hover:opacity-100 group-hover:max-h-40 text-white/90 text-xs mt-1 transition-all duration-300 leading-snug">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-20 relative overflow-hidden">
        {/* Section background: Bgsec4 image with teal overlay */}
        <div className="absolute inset-0">
          <Image src="/images/Bgsec4.jpg" alt="" fill className="object-cover" />
          <div className="absolute inset-0 bg-[#85A8AE]/75" />
        </div>

        <div className="relative max-w-5xl mx-auto px-5">
          <div className="rounded-2xl overflow-hidden grid md:grid-cols-[5fr_7fr] shadow-2xl">
            {/* Left: terracotta panel */}
            <div className="bg-[#BE6A45] p-10 flex flex-col justify-center">
              <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
                Book Your Eco-Getaway with us!
              </h2>
              <p className="text-white/80 text-sm leading-relaxed mb-6">
                Escape the hustle and bustle of life and embark on a journey of eco-friendly discovery at our guest house.
              </p>
              <div className="space-y-1.5 text-white/80 text-sm mb-8">
                <p>Email: <a href="mailto:info@bokoboko.org" className="font-bold text-white hover:underline">info@bokoboko.org</a></p>
                <p>Phone: +233 59 864 1683</p>
                <p>Address: Busua, Western Region, Ghana</p>
              </div>
              <a href="#search"
                className="inline-block bg-white text-[#BE6A45] font-bold px-7 py-3 rounded-lg hover:bg-gray-100 transition-colors w-fit">
                Book Now
              </a>
            </div>

            {/* Right: people photo */}
            <div className="relative min-h-[320px]">
              <Image src="/images/terra.jpg" alt="Guests at BokoBoko" fill className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white pt-14 pb-8">
        <div className="max-w-6xl mx-auto px-5 grid md:grid-cols-2 gap-12 items-center mb-10">
          {/* Left */}
          <div>
            <Image src="/images/Boko-Logo.png" alt="BokoBoko" width={140} height={65}
              className="h-16 w-auto object-contain mb-6" />
            <div className="space-y-2 text-sm text-gray-300 mb-7">
              <p>Email: <a href="mailto:info@bokoboko.org" className="text-[#BE6A45] hover:underline">info@bokoboko.org</a></p>
              <p>Phone: +233 59 864 1683</p>
              <p>Address: Busua, Western Region, Ghana</p>
            </div>
            <div className="flex gap-3">
              <a href="https://www.facebook.com/bokobokoguesthouse" target="_blank" rel="noopener"
                className="bg-[#BE6A45] hover:bg-[#a85a38] transition-colors p-3 rounded-lg">
                <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
                  <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
                </svg>
              </a>
              <a href="https://www.instagram.com/bokobokoguesthouse" target="_blank" rel="noopener"
                className="bg-[#BE6A45] hover:bg-[#a85a38] transition-colors p-3 rounded-lg">
                <svg width="20" height="20" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
              </a>
              <a href="https://www.tripadvisor.com" target="_blank" rel="noopener"
                className="bg-[#BE6A45] hover:bg-[#a85a38] transition-colors p-3 rounded-lg">
                <svg width="20" height="20" fill="white" viewBox="0 0 24 24">
                  <path d="M3 3h4v4H3zm7 0h4v4h-4zm7 0h4v4h-4zM3 10h4v4H3zm7 0h4v4h-4zm7 0h4v4h-4zM3 17h4v4H3zm7 0h4v4h-4zm7 0h4v4h-4z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Right: Map */}
          <div className="rounded-2xl overflow-hidden h-72 md:h-80 shadow-lg">
            <iframe
              src="https://maps.google.com/maps?q=BokoBoko+Guesthouse+Busua+Ghana&t=&z=15&ie=UTF8&iwloc=&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="BokoBoko Guesthouse location"
            />
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-5 border-t border-gray-800 pt-6">
          <p className="text-gray-400 text-sm">© {new Date().getFullYear()} BokoBoko. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
