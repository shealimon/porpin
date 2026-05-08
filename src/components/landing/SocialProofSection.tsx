import { useState } from 'react'
import { Star, StarHalf } from 'lucide-react'

import { cn } from '@/lib/utils'

type AvatarTone = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h'

const AVATAR_GRADIENT: Record<AvatarTone, string> = {
  a: 'from-teal-600 to-emerald-700',
  b: 'from-stone-600 to-amber-800',
  c: 'from-emerald-600 to-teal-800',
  d: 'from-amber-600 to-orange-800',
  e: 'from-rose-600 to-rose-800',
  f: 'from-cyan-600 to-sky-800',
  g: 'from-violet-600 to-violet-900',
  h: 'from-fuchsia-600 to-rose-700',
}

function initialsFromName(name: string): string {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter((p) => !/^(dr|mr|mrs|ms|prof)\.?$/i.test(p))
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
  }
  if (parts.length === 1) return (parts[0]!.slice(0, 2) ?? '?').toUpperCase()
  return '??'
}

/** Star display: 4, 4.5, or 5 (out of 5). */
type TestimonialRating = 4 | 4.5 | 5

type Testimonial = {
  name: string
  /** Short type label, e.g. "Academic", "Startup" */
  category: string
  /** City / role */
  meta: string
  body: string
  tone: AvatarTone
  /** User-facing review score (visual only). */
  rating: TestimonialRating
  /** `public/testimonials/*.jpg` — on load error, `TestimonialAvatar` falls back to gradient initials. */
  avatarUrl?: string
}

/**
 * Portraits: Pexels (free use) — one JPEG per name in `public/testimonials/`.
 * North / NCR, Hindi-belt, and NCR-adjacent cities; names and regions aligned for Hinglish use.
 * Duplicated in the UI for the marquee (same array ×2 in code, then ×2 in markup for the loop).
 */
const TESTIMONIALS: Testimonial[] = [
  {
    category: 'Academic & research',
    name: 'Priya Sharma',
    meta: 'PhD scholar · Delhi',
    body:
      'Long PDFs stay structured—headings and lists don’t break. For my thesis chapters, the output is actually readable, not machine Hinglish.',
    tone: 'a',
    rating: 5,
    avatarUrl: '/testimonials/priya-sharma.jpg',
  },
  {
    category: 'Editorial & content',
    name: 'Arjun Verma',
    meta: 'Freelance editor · Lucknow',
    body:
      'Pehle word count aur price clear dikhta hai, phir payment. No surprise on the card—exactly how I work with clients.',
    tone: 'b',
    rating: 4.5,
    avatarUrl: '/testimonials/arjun-verma.jpg',
  },
  {
    category: 'Publishing & writing',
    name: 'Kavita Mishra',
    meta: 'Indie author · Varanasi',
    body:
      'The Hinglish sounds like how we talk—natural, not textbook. I use it on drafts before sharing with my readers.',
    tone: 'c',
    rating: 5,
    avatarUrl: '/testimonials/kavita-mishra.jpg',
  },
  {
    category: 'Startups & product',
    name: 'Rohit Yadav',
    meta: 'Founder · Noida',
    body:
      'We needed internal docs in Hinglish for the team. Upload once, get clean DOCX—saves the design team a ton of back-and-forth.',
    tone: 'd',
    rating: 4,
    avatarUrl: '/testimonials/rohit-yadav.jpg',
  },
  {
    category: 'Students & campus',
    name: 'Ananya Singh',
    meta: 'UG student · Bhopal',
    body:
      'Syllabus PDFs to notes-style Hinglish in one go. Exam prep ke liye bahut useful when English-only PDFs feel heavy.',
    tone: 'e',
    rating: 4.5,
    avatarUrl: '/testimonials/ananya-singh.jpg',
  },
  {
    category: 'Media & comms',
    name: 'Neha Gupta',
    meta: 'NGO comms lead · Gurugram',
    body:
      'Press notes and long reports—we localize tone without sounding translated. The estimate before pay is the clincher for us.',
    tone: 'f',
    rating: 5,
    avatarUrl: '/testimonials/neha-gupta.jpg',
  },
  {
    category: 'Finance & law',
    name: 'Sarvesh Tripathi',
    meta: 'CA article · Kanpur',
    body:
      'Client memos: structure stays so tables and section numbers don’t break. I still review, but the first pass is solid.',
    tone: 'g',
    rating: 4,
    avatarUrl: '/testimonials/sarvesh-tripathi.jpg',
  },
  {
    category: 'Hobby readers',
    name: 'Meera Saxena',
    meta: 'Comics & long reads · Jaipur',
    body:
      'Fan translations in Hinglish that read fun, not bot-like. I binge whole folders on weekends—worth the per-job pricing.',
    tone: 'h',
    rating: 4.5,
    avatarUrl: '/testimonials/meera-saxena.jpg',
  },
  {
    category: 'Healthcare',
    name: 'Dr. Amit Tiwari',
    meta: 'Clinician & reader · Allahabad',
    body:
      'For patient education PDFs, clear simple Hinglish matters. I check medical terms myself, but the base layer is very usable.',
    tone: 'a',
    rating: 5,
    avatarUrl: '/testimonials/amit-tiwari.jpg',
  },
  {
    category: 'Fiction & self-pub',
    name: 'Deepak Chauhan',
    meta: 'Novelist · Patna',
    body:
      'Chapter-wise experiments with voice. Not every line is final, but the flow feels like conversation—then I edit in Scrivener.',
    tone: 'b',
    rating: 4,
    avatarUrl: '/testimonials/deepak-chauhan.jpg',
  },
]

function TestimonialAvatar({ name, avatarUrl, tone }: { name: string; avatarUrl?: string; tone: AvatarTone }) {
  const [imgFailed, setImgFailed] = useState(false)

  if (avatarUrl && !imgFailed) {
    return (
      <img
        src={avatarUrl}
        alt=""
        width={56}
        height={56}
        loading="lazy"
        decoding="async"
        onError={() => setImgFailed(true)}
        className="size-14 shrink-0 rounded-full object-cover object-top ring-2 ring-white shadow-md ring-stone-200/80"
      />
    )
  }
  const inits = initialsFromName(name)
  return (
    <div
      className={cn(
        'flex size-14 shrink-0 select-none items-center justify-center rounded-full',
        'bg-gradient-to-br font-outfit text-lg font-semibold tracking-tight text-white',
        'shadow-md ring-2 ring-white ring-stone-200/80',
        AVATAR_GRADIENT[tone],
      )}
      aria-hidden
    >
      {inits}
    </div>
  )
}

const STAR_CLS = 'size-3.5 shrink-0 sm:size-4'
const STAR_FULL = `${STAR_CLS} fill-amber-400 text-amber-500`
const STAR_EMPTY = `${STAR_CLS} fill-stone-200 text-stone-300`
/** Per Lucide, same 24×24 viewBox as `Star` — use for 4.5 so size matches the four full stars. */
const HALF_FOREGROUND = `${STAR_CLS} fill-amber-400 text-amber-500`
const HALF_BACKGROUND = `${STAR_CLS} fill-stone-200 text-stone-300`

/**
 * 4.5th star: grey full star + Lucide `StarHalf` on top (identical box to `Star`, no clip scaling).
 */
function HalfStar() {
  return (
    <span
      className="relative inline-block h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4"
      aria-hidden
    >
      <Star
        className={cn('pointer-events-none absolute inset-0 h-full w-full', HALF_BACKGROUND)}
        strokeWidth={0}
      />
      <StarHalf
        className={cn('pointer-events-none absolute inset-0 h-full w-full', HALF_FOREGROUND)}
        strokeWidth={0}
      />
    </span>
  )
}

function CardReviewStars({ rating }: { rating: TestimonialRating }) {
  const full = Math.floor(rating)
  const hasHalf = rating % 1 >= 0.5 && rating < 5
  const empty = 5 - full - (hasHalf ? 1 : 0)
  const label = rating === 4.5 ? '4.5' : String(rating)

  return (
    <div
      className="mb-2.5 flex items-center gap-0.5"
      role="img"
      aria-label={`Rated ${label} out of 5 stars`}
    >
      {Array.from({ length: full }, (_, i) => (
        <Star key={`f-${i}`} className={STAR_FULL} strokeWidth={0} aria-hidden />
      ))}
      {hasHalf ? <HalfStar key="h" /> : null}
      {Array.from({ length: empty }, (_, i) => (
        <Star key={`e-${i}`} className={STAR_EMPTY} strokeWidth={0} aria-hidden />
      ))}
    </div>
  )
}

function TestimonialCard({ t, className }: { t: Testimonial; className?: string }) {
  return (
    <article
        className={cn(
        'flex h-full w-[min(18rem,85vw)] max-w-full flex-shrink-0 flex-col sm:w-80',
        'rounded-2xl border border-stone-200/80 bg-white/90 p-4 shadow-sm shadow-stone-900/[0.04] backdrop-blur-sm sm:p-5',
        className,
      )}
    >
      <p className="mb-1 font-outfit text-[0.65rem] font-bold uppercase tracking-[0.12em] text-teal-700/90">{t.category}</p>
      <div className="mb-3 flex gap-3">
        <TestimonialAvatar name={t.name} avatarUrl={t.avatarUrl} tone={t.tone} />
        <div className="min-w-0 pt-0.5">
          <p className="m-0 font-outfit text-sm font-semibold leading-tight text-stone-900 sm:text-base">{t.name}</p>
          <p className="mt-0.5 font-outfit text-[0.7rem] leading-snug text-stone-500 sm:text-xs">{t.meta}</p>
        </div>
      </div>
      <CardReviewStars rating={t.rating} />
      <blockquote className="m-0 border-t border-stone-100 pt-3 font-outfit text-[0.85rem] leading-[1.5] text-stone-800 sm:text-[0.9375rem] sm:leading-relaxed">
        <p className="m-0">“{t.body}”</p>
      </blockquote>
    </article>
  )
}

export function SocialProofSection() {
  const track = [...TESTIMONIALS, ...TESTIMONIALS]

  return (
    <section
      id="testimonials"
      aria-labelledby="social-proof-heading"
      className={cn(
        'w-full min-w-0 max-w-full scroll-mt-28',
        'border-t border-stone-200/90 bg-[linear-gradient(180deg,#f6f4f1_0%,#f0ebe4_45%,#f6f4f1_100%)]',
        'px-0 py-14 sm:px-0 sm:py-20',
      )}
    >
      <div className="mx-auto w-full min-w-0 max-w-6xl px-0">
        <p className="mb-2 text-center font-outfit text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-500 sm:text-[11px]">
          Testimonials
        </p>
        <h2
          id="social-proof-heading"
          className="mx-auto max-w-2xl text-balance text-center font-display text-[1.4rem] font-normal leading-snug tracking-[-0.02em] text-stone-900 sm:text-2xl sm:leading-tight"
        >
          What readers &amp; writers across India are saying
        </h2>
        <p className="mx-auto mt-3 max-w-lg text-center font-outfit text-sm leading-relaxed text-stone-600 sm:text-base">
          Different use cases—academia, teams, comms, and more. Hover the strip to pause.
        </p>

        <p className="mb-6 mt-5 flex flex-wrap items-center justify-center gap-0.5 sm:mb-8 sm:mt-6">
          <span className="flex items-center gap-0.5" aria-hidden>
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                className="size-4 fill-amber-400/90 text-amber-500/90 sm:size-4"
                strokeWidth={0}
              />
            ))}
          </span>
          <span className="ml-2 font-outfit text-sm text-stone-600 sm:text-[0.9375rem]">Early user feedback</span>
        </p>

        {/* Marquee: animation from index.css; stays within max-w-6xl like pricing above. */}
        <div
          role="region"
          aria-label="Testimonials, scrolling. Hover to pause."
          className={cn(
            'testimonial-marquee-wrap -mx-1 min-w-0 overflow-hidden rounded-2xl border border-stone-200/60 bg-stone-50/40 px-0 py-2 sm:-mx-0',
            'max-[prefers-reduced-motion:reduce]:hidden',
            '[mask-image:linear-gradient(90deg,transparent_0%,black_5%,black_95%,transparent_100%)]',
          )}
        >
          <div
            className={cn(
              'testimonial-marquee-track w-max min-w-0 max-w-none gap-4 py-1 pl-3 sm:gap-5 sm:pl-4',
            )}
          >
            {track.map((t, i) => (
              <TestimonialCard key={`${t.name}-${i}`} t={t} />
            ))}
          </div>
        </div>

        <div className="hidden max-[prefers-reduced-motion:reduce]:mt-2 max-[prefers-reduced-motion:reduce]:block">
          <ul className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <li key={t.name} className="min-w-0">
                <TestimonialCard t={t} className="!w-full min-w-0 max-w-full flex-1" />
              </li>
            ))}
          </ul>
        </div>
      </div>

    </section>
  )
}
