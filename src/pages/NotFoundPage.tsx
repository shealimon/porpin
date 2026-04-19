import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-[#050506] px-4 py-16 font-outfit text-center">
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(139,92,246,0.18),transparent)]"
        aria-hidden
      />
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">404</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
        Page not found
      </h1>
      <p className="mt-2 max-w-md text-zinc-400">
        That URL does not exist or was moved.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex items-center justify-center rounded-full border border-[#dfff7a]/35 bg-[#c8ff00] px-6 py-2.5 text-sm font-semibold text-zinc-950 no-underline shadow-lg shadow-[#c8ff00]/25 transition hover:bg-[#b8ef00]"
      >
        Back home
      </Link>
    </div>
  )
}
