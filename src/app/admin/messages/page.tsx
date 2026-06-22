export default function MessagesPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="w-14 h-14 bg-[#2d5a27]/10 rounded-2xl flex items-center justify-center mb-4">
        <svg width="28" height="28" fill="none" stroke="#2d5a27" strokeWidth="1.8" viewBox="0 0 24 24">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-800 mb-1">Messages</h2>
      <p className="text-gray-400 text-sm">Coming soon</p>
    </div>
  );
}
