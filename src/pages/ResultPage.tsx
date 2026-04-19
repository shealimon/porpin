import { Link, useNavigate } from 'react-router-dom'
import { useJobStore } from '@/stores/jobStore'
import { getJobDownloadUrl } from '../api/jobs'

export function ResultPage() {
  const navigate = useNavigate()
  const job = useJobStore((s) => s.job)
  const resetSession = useJobStore((s) => s.resetSession)

  if (!job || job.status !== 'completed') {
    return (
      <div className="page">
        <p>No completed job to show.</p>
        <Link to="/" className="btn btn--primary">
          Upload
        </Link>
      </div>
    )
  }

  const url = getJobDownloadUrl(job.id)

  const onNew = () => {
    resetSession()
    navigate('/')
  }

  return (
    <div className="page">
      <h1>Ready</h1>
      <p className="page__lede">
        Your translation for <strong>{job.fileName}</strong> is complete.
      </p>
      <div className="page__actions">
        <a className="btn btn--primary" href={url} download>
          Download result
        </a>
        <button type="button" className="btn btn--ghost" onClick={onNew}>
          New upload
        </button>
      </div>
    </div>
  )
}
