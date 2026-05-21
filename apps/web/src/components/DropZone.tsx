import React, { useRef, useState, useCallback } from 'react';
import './DropZone.css';

interface DropZoneProps {
  onFile: (file: File) => void;
  accept?: string;
  disabled?: boolean;
  className?: string;
  hint?: string;
}

const DropZone: React.FC<DropZoneProps> = ({
  onFile,
  accept = '.pdf,.txt,.md',
  disabled = false,
  className = '',
  hint,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const processFile = useCallback(
    (file: File | null) => {
      if (file && !disabled) {
        onFile(file);
      }
    },
    [onFile, disabled],
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) setIsDragOver(true);
    },
    [disabled],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        e.dataTransfer.dropEffect = 'copy';
        setIsDragOver(true);
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      if (disabled) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        processFile(files[0]);
      }
    },
    [disabled, processFile],
  );

  const handleClick = useCallback(() => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  }, [disabled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        processFile(files[0]);
      }
      // Reset so the same file can be re-selected
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    },
    [processFile],
  );

  const formatAcceptHint = (acceptStr: string): string => {
    return acceptStr
      .split(',')
      .map((ext) => ext.trim().replace(/^\./, '').toUpperCase())
      .join(', ');
  };

  const hintText = hint || `Drop your file here or click to browse (${formatAcceptHint(accept)})`;

  return (
    <div
      className={`dropzone ${isDragOver ? 'dropzone--active' : ''} ${disabled ? 'dropzone--disabled' : ''} ${className}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={hintText}
    >
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        className="dropzone__input"
        accept={accept}
        onChange={handleInputChange}
        disabled={disabled}
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Icon */}
      <div className="dropzone__icon" aria-hidden="true">
        <svg
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12 16V4m0 0L8 8m4-4l4 4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Hint text */}
      <p className="dropzone__hint">{hintText}</p>
    </div>
  );
};

export { DropZone };
export type { DropZoneProps };
export default DropZone;
