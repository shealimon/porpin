import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FileUploader } from '../components/FileUploader'
import { createJobFromFile } from '../api/jobs'
import { useJobStore } from '@/stores/jobStore'
import { usePricingConfig } from '@/hooks/usePricingConfig'
import { formatBytes } from '../utils/format'

export function UploadPage() {
  const { pricing } = usePricingConfig()
  const navigate = useNavigate()
  const file = useJobStore((s) => s.file)
  const setFile = useJobStore((s) => s.setFile)
  const setJob = useJobStore((s) => s.setJob)
  const resetSession = useJobStore((s) => s.resetSession)

  const onContinue = async () => {
    if (!file) {
      toast.error('Choose a file first')
      return
    }
    try {
      const { id } = await createJobFromFile(file)
      const now = new Date().toISOString()
      setJob({
        id,
        status: 'pending_estimate',
        fileName: file.name,
        fileSizeBytes: file.size,
        createdAt: now,
        updatedAt: now,
        progressPercent: 0,
      })
      navigate('/estimate')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    }
  }

  return (
    <div className="page page--upload">
      <h1>Upload document</h1>
      <p className="page__lede">
        Upload a file to get a word count and price estimate before processing.
      </p>
      <FileUploader
        onFile={(f) => {
          resetSession()
          setFile(f)
        }}
        maxSize={
          pricing.max_upload_file_mb > 0
            ? pricing.max_upload_file_mb * 1024 * 1024
            : undefined
        }
      />
      {file && (
        <p className="page__file-meta">
          <strong>{file.name}</strong>
          <span className="muted"> · {formatBytes(file.size)}</span>
        </p>
      )}
      <div className="page__actions">
        <button type="button" className="btn btn--primary" onClick={onContinue} disabled={!file}>
          Continue to estimate
        </button>
      </div>
    </div>
  )
}
