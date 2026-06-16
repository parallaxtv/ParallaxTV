export function StarRating({ rating, voteCount }: { rating?: number | null; voteCount?: number | null }) {
  if (!rating) return null;
  const score = Math.round(rating * 10) / 10;
  const filled = Math.round(rating / 2);
  
  return (
    <span className="flex items-center gap-1.5">
      <span className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <svg key={i} className={`w-4 h-4 ${i <= filled ? "text-yellow-400" : "text-gray-600"}`} fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </span>
      <span className="text-yellow-400 font-semibold text-sm">{score}</span>
      {voteCount && <span className="text-gray-500 text-xs">({voteCount.toLocaleString()})</span>}
    </span>
  );
}