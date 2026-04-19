import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { PriceCard } from '../components/PriceCard'
import { fetchJobEstimate, startJob } from '../api/jobs'
import { qk } from '@/lib/queryKeys'
import { queryClient } from '@/lib/queryClient'
import { useJobStore } from '@/stores/jobStore'

export function EstimatePage() {
  const navigate = useNavigate()
  const job = useJobStore((s) => s.job)
  const estimate = useJobStore((s) => s.estimate)
  const setEstimate = useJobStore((s) => s.setEstimate)
  const upsertHistory = useJobStore((s) => s.upsertHistory)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!job) {
      setLoading(false)
      return
    }
    const { id, fileName, createdAt } = job
    if (!id || !fileName || !createdAt) {
      // Avoid infinite “Calculating estimate…” when job is incomplete (e.g. bad hydration).
      setLoading(false)
      toast.error('Session data is incomplete. Start again from upload.')
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const est = await fetchJobEstimate(id)
        if (!cancelled) {
          setEstimate(est)
          upsertHistory({
            id,
            fileName,
            status: 'estimated',
            createdAt,
            amountCents: est.amountCents,
            currency: est.currency,
          })
          void queryClient.invalidateQueries({ queryKey: qk.jobs.all })
        }
      } catch (e) {
        if (!cancelled) {
          toast.error(e instanceof Error ? e.message : 'Estimate failed')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [job?.id, job?.fileName, job?.createdAt, setEstimate, upsertHistory])

  if (!job) {
    return (
      <div className="page">
        <p>No active upload. Start from the upload page.</p>
        <Link to="/" className="btn btn--primary">
          Go to upload
        </Link>
      </div>
    )
  }

  const onStart = async () => {
    try {
      setStarting(true)
      await startJob(job.id)
      navigate('/processing')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not start job')
    } finally {
      setStarting(false)
    }
  }

  return (
    <div className="page">
      <h1>Review estimate</h1>
      <p className="page__lede muted">{job.fileName}</p>
      {loading && <p>Calculating estimate…</p>}
      {!loading && estimate && (
        <>
          <PriceCard
            wordCount={estimate.wordCount}
            amountCents={estimate.amountCents}
            currency={estimate.currency}
          />
          <div className="page__actions">
            <Link to="/" className="btn btn--ghost">
              Back
            </Link>
            <button
              type="button"
              className="btn btn--primary"
              onClick={onStart}
              disabled={starting}
            >
              {starting ? 'Starting…' : 'Start processing'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
