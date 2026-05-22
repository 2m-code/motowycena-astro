import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';

export interface HeroReview {
  author: string;
  role?: string;
  rating: number;
  text: string;
  service?: string;
}

interface HeroReviewsProps {
  reviews: HeroReview[];
  /** Auto-rotate interval in ms (default 6000). 0 disables auto-rotate. */
  intervalMs?: number;
}

const HERO_REVIEW_LAYOUT = {
  x: 9,
  y: 10,
  width: 427,
  height: 188,
};

export default function HeroReviews({ reviews, intervalMs = 6000 }: HeroReviewsProps) {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || intervalMs <= 0 || reviews.length <= 1) return;
    const t = window.setInterval(() => {
      setIdx((i) => (i + 1) % reviews.length);
    }, intervalMs);
    return () => window.clearInterval(t);
  }, [paused, intervalMs, reviews.length]);

  if (reviews.length === 0) return null;
  const current = reviews[idx];

  return (
    <div
      className="hero-review-card-enter group/reviews relative flex flex-col overflow-hidden rounded-xl border border-white/15 bg-slate-950/55 p-4 text-white shadow-2xl shadow-black/35 backdrop-blur-md"
      style={{
        width: `min(${HERO_REVIEW_LAYOUT.width}px, calc(100vw - 2rem))`,
        height: `${HERO_REVIEW_LAYOUT.height}px`,
        maxWidth: 'min(92vw, 560px)',
        transform: `translate3d(${HERO_REVIEW_LAYOUT.x}px, ${HERO_REVIEW_LAYOUT.y}px, 0)`,
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      role="region"
      aria-label="Opinie klientów"
      aria-live="polite"
    >
      <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
        <div key={`stars-${idx}`} className="review-stars flex items-center gap-1" aria-label={`Ocena ${current.rating} na 5`}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              size={14}
              className={i < current.rating ? 'fill-amber-400 stroke-amber-400' : 'stroke-white/30'}
              aria-hidden="true"
            />
          ))}
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white/80">
          <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true">
            <path fill="#4285F4" d="M22.5 12.23c0-.7-.06-1.36-.18-2H12v3.79h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.75h3.57c2.09-1.93 3.22-4.77 3.22-7.85z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.75c-.99.66-2.25 1.06-3.71 1.06-2.85 0-5.27-1.93-6.13-4.52H2.18v2.84A10.99 10.99 0 0 0 12 23z"/>
            <path fill="#FBBC05" d="M5.87 14.13a6.62 6.62 0 0 1 0-4.26V7.03H2.18a11 11 0 0 0 0 9.94l3.69-2.84z"/>
            <path fill="#EA4335" d="M12 4.75c1.61 0 3.06.56 4.21 1.65l3.15-3.15C17.45 1.5 14.97.5 12 .5A10.99 10.99 0 0 0 2.18 7.03l3.69 2.84C6.73 7.28 9.15 4.75 12 4.75z"/>
          </svg>
          Google
        </span>
      </div>

      <div key={idx} className="hero-review-fade flex min-h-0 flex-1 flex-col">
        <p className="review-copy min-h-9 flex-1 overflow-hidden break-words text-xs leading-relaxed text-white/95">
          {current.text}
        </p>
        <div className="review-meta mt-2 flex shrink-0 items-baseline justify-between gap-2">
          <p className="min-w-0 text-xs font-semibold text-white">
            {current.author}
          </p>
        </div>
      </div>

      {reviews.length > 1 && (
        <div className="mt-3 flex shrink-0 items-center justify-center">
          <div className="flex gap-1" role="tablist" aria-label="Wybierz opinię">
            {reviews.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Opinia ${i + 1} z ${reviews.length}`}
                aria-selected={i === idx}
                role="tab"
                className={`h-1.5 rounded-full transition-all ${
                  i === idx ? 'w-6 bg-white' : 'w-1.5 bg-white/30 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      <style>{`
        .hero-review-card-enter {
          animation: heroReviewCardEnter 0.7s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .hero-review-fade {
          animation: heroReviewFade 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .review-copy {
          animation: heroReviewText 0.55s cubic-bezier(0.22, 1, 0.36, 1) 0.05s both;
        }
        .review-meta {
          animation: heroReviewText 0.45s cubic-bezier(0.22, 1, 0.36, 1) 0.14s both;
        }
        .review-stars svg {
          animation: heroReviewStar 0.38s cubic-bezier(0.2, 1.4, 0.32, 1) both;
          transform-origin: center;
        }
        .review-stars svg:nth-child(2) { animation-delay: 0.04s; }
        .review-stars svg:nth-child(3) { animation-delay: 0.08s; }
        .review-stars svg:nth-child(4) { animation-delay: 0.12s; }
        .review-stars svg:nth-child(5) { animation-delay: 0.16s; }
        @keyframes heroReviewCardEnter {
          0% { opacity: 0; filter: blur(8px); }
          100% { opacity: 1; filter: blur(0); }
        }
        @keyframes heroReviewFade {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroReviewText {
          0% { opacity: 0; transform: translateY(7px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroReviewStar {
          0% { opacity: 0; transform: scale(0.72) rotate(-8deg); }
          100% { opacity: 1; transform: scale(1) rotate(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-review-card-enter,
          .hero-review-fade,
          .review-copy,
          .review-meta,
          .review-stars svg {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
