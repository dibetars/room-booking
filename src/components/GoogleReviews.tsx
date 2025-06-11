import { useState } from 'react';

const reviews = [
  {
    author: 'Raymond Schönfeld',
    rating: 4,
    time: 'a year ago',
    text: 'Sun Downer Party was nice. Some good drinks. The building is not finished but it is enough to have a bit of fun by the rooftop bar.'
  },
  {
    author: 'P H',
    rating: 5,
    time: '8 months ago',
    text: 'Amazing rooftop, beautiful rooms and nice interior. The staff is super nice and we had a great time. Thank you so much!'
  },
  {
    author: 'Eleonora Lombriser',
    rating: 5,
    time: '8 months ago',
    text: 'Wonderful tranquil place a bit land in from Busua Beach in the jungle. You can walk easily down to town and the absolute plus is the rooftop terrace which is the cosiest and most relaxed place around. ✨'
  },
  {
    author: 'Kojo Buaku',
    rating: 5,
    time: 'a month ago',
    text: `Business | Solo\nIt is a nice place to be if you love to enjoy nature and vegetation.\nRooms: 5.0\tService: 5.0\tLocation: 4.0\nHotel highlights: Great view · Quiet · Great value\nRooms: Very simple room with a unique bed design\nNearby activities: There is an agriculture activity there where you learn how oyster mushroom is made. There is a soap factory in the facility\nSafety: Very safe\nWalkability: Very walkable to the Busua town\nFood and drinks: There is breakfast and drinks.`
  }
];

const GoogleReviews = () => {
  const [current, setCurrent] = useState(0);
  const total = reviews.length;

  const prev = () => setCurrent((c) => (c === 0 ? total - 1 : c - 1));
  const next = () => setCurrent((c) => (c === total - 1 ? 0 : c + 1));

  const review = reviews[current];

  return (
    <div style={{ background: 'white', borderRadius: 8, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', maxWidth: 1000, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
      <h3 style={{ marginTop: 0 }}>Google Reviews</h3>
      <div style={{ minHeight: 120 }}>
        <strong>{review.author}</strong> <span style={{ color: '#fbc02d' }}>{'★'.repeat(review.rating)}</span> <span style={{ color: '#888' }}>{review.time}</span>
        <div style={{ marginTop: 8, whiteSpace: 'pre-line', fontSize: 16 }}>{review.text}</div>
      </div>
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16 }}>
        <button onClick={prev} aria-label="Previous review" style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }}>&lt;</button>
        <span style={{ fontSize: 14, color: '#888' }}>{current + 1} / {total}</span>
        <button onClick={next} aria-label="Next review" style={{ fontSize: 20, background: 'none', border: 'none', cursor: 'pointer' }}>&gt;</button>
      </div>
      <a
        href="https://search.google.com/local/writereview?placeid=ChIJt6GvCQCb5w8Ranny_PKZiPo"
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'inline-block', marginTop: 20 }}
      >
        Leave a Google Review
      </a>
    </div>
  );
};

export default GoogleReviews; 