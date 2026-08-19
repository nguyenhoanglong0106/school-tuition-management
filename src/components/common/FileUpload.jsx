import { useRef, useState } from 'react';
import { UploadCloud, File as FileIcon, X } from 'lucide-react';
import { formatFileSize } from '@/utils/formatters';

const FORBIDDEN_EXT = ['.exe', '.php', '.sh', '.bat', '.cmd', '.js', '.msi', '.ps1'];

export function FileUpload({ file, onFileChange, accept, maxSizeMB = 20, label = 'Chọn tệp' }) {
  const inputRef = useRef(null);
  const [error, setError] = useState('');

  const validate = (f) => {
    if (!f) return null;
    const ext = '.' + f.name.split('.').pop().toLowerCase();
    if (FORBIDDEN_EXT.includes(ext)) {
      return `Loại tệp ${ext} không được phép tải lên`;
    }
    if (f.size > maxSizeMB * 1024 * 1024) {
      return `Tệp quá lớn. Tối đa ${maxSizeMB}MB`;
    }
    return null;
  };

  const handleSelect = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const err = validate(f);
    if (err) {
      setError(err);
      onFileChange(null);
      return;
    }
    setError('');
    onFileChange(f);
  };

  return (
    <div>
      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-full border-2 border-dashed border-slate-200 rounded-2xl py-8 px-4 flex flex-col items-center gap-2 text-slate-400 hover:border-primary-400 hover:text-primary-500 transition-colors"
        >
          <UploadCloud size={28} />
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs">Tối đa {maxSizeMB}MB</span>
        </button>
      ) : (
        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
          <FileIcon size={20} className="text-primary-600 flex-shrink-0" />
          <div className="flex-1 overflow-hidden">
            <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
            <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              onFileChange(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
            className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600"
          >
            <X size={16} />
          </button>
        </div>
      )}
      <input ref={inputRef} type="file" accept={accept} onChange={handleSelect} className="hidden" />
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}
