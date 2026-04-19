import { useCallback } from 'react'
import { useDropzone, type DropzoneOptions } from 'react-dropzone'

type FileUploaderProps = {
  onFile: (file: File) => void
  accept?: DropzoneOptions['accept']
  maxSize?: number
  disabled?: boolean
}

export function FileUploader({
  onFile,
  accept,
  maxSize,
  disabled,
}: FileUploaderProps) {
  const onDrop = useCallback(
    (files: File[]) => {
      const f = files[0]
      if (f) onFile(f)
    },
    [onFile],
  )

  const { getRootProps, getInputProps, isDragActive, fileRejections } =
    useDropzone({
      onDrop,
      maxFiles: 1,
      maxSize,
      accept,
      disabled,
    })

  return (
    <div className="file-uploader">
      <div
        {...getRootProps({
          className: `file-uploader__zone${isDragActive ? ' file-uploader__zone--active' : ''}${disabled ? ' file-uploader__zone--disabled' : ''}`,
        })}
      >
        <input {...getInputProps()} />
        <p className="file-uploader__title">
          {isDragActive ? 'Drop file here' : 'Drag a file here, or click to browse'}
        </p>
        <p className="file-uploader__hint">One file at a time</p>
      </div>
      {fileRejections.length > 0 && (
        <p className="file-uploader__error" role="alert">
          {fileRejections[0]?.errors[0]?.message ?? 'File not accepted'}
        </p>
      )}
    </div>
  )
}
