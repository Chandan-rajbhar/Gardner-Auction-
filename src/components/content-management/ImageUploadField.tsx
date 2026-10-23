import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { uploadSiteAsset } from '../../services/siteContentService';

interface ImageUploadFieldProps {
  label: string;
  value: string;
  altText?: string;
  onChange: (url: string) => void;
  onAltChange?: (alt: string) => void;
  presetOptions?: Array<{ label: string; url: string }>;
  helperText?: string;
}

export const ImageUploadField: React.FC<ImageUploadFieldProps> = ({
  label,
  value,
  altText,
  onChange,
  onAltChange,
  presetOptions,
  helperText
}) => {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    try {
      const res = await uploadSiteAsset(file, 'site-assets');
      if (res.success && res.url) {
        onChange(res.url);
        setUploadSuccess(true);
        setTimeout(() => setUploadSuccess(false), 3000);
      } else {
        setUploadError(res.error || 'Failed to upload image.');
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="form-group" style={{ marginBottom: 16 }}>
      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{label}</span>
        {uploadSuccess && (
          <span style={{ fontSize: 11, color: '#10b981', display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckCircle2 size={12} /> Uploaded to Storage
          </span>
        )}
      </label>

      {/* URL Input and File Picker Button */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter asset URL (/images/...) or upload file"
          style={{ flex: 1 }}
        />
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          style={{ display: 'none' }}
        />
        <button
          type="button"
          className="btn btn-outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13 }}
        >
          {uploading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <Upload size={14} />
              <span>Upload</span>
            </>
          )}
        </button>
      </div>

      {helperText && (
        <span style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
          {helperText}
        </span>
      )}

      {/* Preset Fast Selectors if provided */}
      {presetOptions && presetOptions.length > 0 && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>Presets:</span>
          {presetOptions.map((opt, i) => (
            <button
              key={i}
              type="button"
              className="btn btn-outline"
              style={{ padding: '2px 8px', fontSize: 11, height: 24, borderRadius: 4 }}
              onClick={() => onChange(opt.url)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {uploadError && (
        <div style={{ fontSize: 12, color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <AlertCircle size={13} />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Alt Text Input if required */}
      {onAltChange && altText !== undefined && (
        <div style={{ marginTop: 8 }}>
          <input
            type="text"
            value={altText}
            onChange={(e) => onAltChange(e.target.value)}
            placeholder="Image alt description (accessibility & SEO)"
            style={{ fontSize: 12 }}
          />
        </div>
      )}

      {/* Live Thumbnail Preview */}
      {value && (
        <div style={{
          marginTop: 10,
          padding: '8px 12px',
          background: '#ffffff',
          borderRadius: 8,
          border: '1px solid #e8e2d5',
          boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <div style={{
            width: 70,
            height: 48,
            borderRadius: 6,
            overflow: 'hidden',
            background: '#faf8f5',
            border: '1px solid rgba(163, 122, 59, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <img
              src={value}
              alt={altText || 'Preview'}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                (e.currentTarget as HTMLElement).style.display = 'none';
              }}
            />
            <ImageIcon size={18} color="var(--text-muted)" style={{ display: 'none' }} />
          </div>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 12 }}>
            <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: 11 }}>Active Image Asset</span>
            <code style={{ fontSize: 11, color: 'var(--gold-primary)' }}>{value}</code>
          </div>
        </div>
      )}
    </div>
  );
};
