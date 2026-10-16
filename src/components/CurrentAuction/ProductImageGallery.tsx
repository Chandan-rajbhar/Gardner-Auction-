import React, { useState, useEffect, useCallback } from 'react';
import {
  ZoomIn,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Image as ImageIcon
} from 'lucide-react';
import type { LotGalleryImage } from './types';

interface ProductImageGalleryProps {
  images: LotGalleryImage[];
  lotNumber: string;
  title: string;
  categoryTag: string;
  artistName?: string;
  artworkTitle?: string;
  artworkMediumSpecs?: string;
  artworkInscriptions?: string;
  sensorCaptureLabel?: string;
  onRequestConditionDossier?: () => void;
}

export const ProductImageGallery: React.FC<ProductImageGalleryProps> = ({
  images,
  lotNumber,
  title,
  categoryTag,
  artistName,
  artworkTitle,
  artworkMediumSpecs,
  artworkInscriptions,
  sensorCaptureLabel
}) => {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isZoomModalOpen, setIsZoomModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  const [prevFirstUrl, setPrevFirstUrl] = useState<string>(images[0]?.url || '');
  const currentFirstUrl = images[0]?.url || '';

  // Reset when images change
  if (currentFirstUrl !== prevFirstUrl) {
    setPrevFirstUrl(currentFirstUrl);
    setActiveIndex(0);
    setIsLoading(false);
    setHasError(false);
  }

  const activeImage = images[activeIndex] || images[0] || {
    id: 'placeholder',
    url: '/images/gorson_painting.jpg',
    alt: title,
    caption: 'Official catalog specimen photograph.'
  };

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  // Keyboard navigation for gallery & zoom modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isZoomModalOpen) {
        if (e.key === 'Escape') {
          setIsZoomModalOpen(false);
        } else if (e.key === 'ArrowRight') {
          handleNext();
        } else if (e.key === 'ArrowLeft') {
          handlePrev();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZoomModalOpen, handleNext, handlePrev]);

  return (
    <div className="cap-gallery-card">
      {/* Top Gallery Header Bar */}
      <div className="cap-gallery-top-bar">
        <div className="cap-gallery-badges">
          <span className="cap-badge-lot">{lotNumber}</span>
          <span className="cap-badge-cat">{categoryTag}</span>
        </div>
        <div className="cap-gallery-cert">
          <ShieldCheck size={14} className="cap-gold-icon" />
          <span>Calibrated 5000K Forensic Specimen</span>
        </div>
      </div>

      {/* Main Image Stage */}
      <div
        className="cap-gallery-stage"
        onClick={() => !hasError && setIsZoomModalOpen(true)}
        role="button"
        tabIndex={0}
        aria-label="Click to inspect specimen in high resolution"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsZoomModalOpen(true);
          }
        }}
      >
        {/* Top-Right Sensor Tag */}
        <div className="cap-sensor-tag">
          {sensorCaptureLabel || 'RAW DNG / 100MP SENSOR CAPTURE'}
        </div>

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="cap-gallery-skeleton">
            <div className="cap-skeleton-shimmer"></div>
            <div className="cap-skeleton-content">
              <ImageIcon size={32} className="cap-skeleton-icon" />
              <span>Loading High-Resolution Specimen...</span>
            </div>
          </div>
        )}

        {/* Fallback Display if image fails */}
        {hasError ? (
          <div className="cap-gallery-fallback">
            <svg width="64" height="64" viewBox="0 0 100 100" fill="none">
              <circle cx="50" cy="50" r="44" stroke="#cba135" strokeWidth="2" strokeDasharray="3 3" />
              <path d="M50 20L53 30H63L55 36L58 46L50 40L42 46L45 36L37 30H47L50 20Z" fill="#cba135" />
              <text x="50" y="70" textAnchor="middle" fill="#cba135" fontSize="11" fontFamily="sans-serif">GARDNER ARCHIVE</text>
            </svg>
            <p>Specimen image preserved in offline gallery vault.</p>
          </div>
        ) : (
          <div className="cap-artwork-frame-wrapper">
            <img
              src={activeImage.url}
              alt={activeImage.alt || title}
              className={`cap-main-img ${isLoading ? 'cap-img-hidden' : 'cap-img-loaded'}`}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false);
                setHasError(true);
              }}
            />
          </div>
        )}

        {/* Zoom prompt badge on bottom of image */}
        <div className="cap-zoom-prompt">
          <ZoomIn size={13} className="cap-gold-icon" />
          <span>CLICK &amp; HOLD FOR 12X FORENSIC ZOOM</span>
        </div>
      </div>


      {/* Artist & Artwork Title Block directly beneath buttons */}
      <div className="cap-artist-header-block">
        <h2 className="cap-artist-name">
          {artistName || 'Aaron Harry Gorson (American/Lithuanian, 1872–1932)'}
        </h2>
        <h3 className="cap-artwork-title">
          {artworkTitle || '"River at Dusk (Industrial Monongahela Nocturne)", c. 1912–1914'}
        </h3>
        <p className="cap-artwork-specs">
          {artworkMediumSpecs || 'Oil on linen canvas · 30 x 36 in. (76.2 x 91.4 cm) · Framed: 41 x 47 in.'}
        </p>
        <p className="cap-artwork-inscriptions">
          {artworkInscriptions || "Signed 'A. H. Gorson' lower right"}
        </p>
      </div>

      {/* Fullscreen High-Resolution Inspection Lightbox Modal */}
      {isZoomModalOpen && (
        <div
          className="cap-lightbox-backdrop"
          onClick={() => setIsZoomModalOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="High-resolution specimen lightbox viewer"
        >
          <div className="cap-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <div className="cap-lightbox-header">
              <div className="cap-lightbox-title-block">
                <span className="cap-lightbox-tag">{lotNumber} · FORENSIC INSPECTION</span>
                <h3 className="cap-lightbox-title">{title}</h3>
              </div>
              <button
                className="cap-lightbox-close"
                onClick={() => setIsZoomModalOpen(false)}
                aria-label="Close high-res viewer"
              >
                <X size={24} />
              </button>
            </div>

            <div className="cap-lightbox-stage">
              <img
                src={activeImage.url}
                alt={activeImage.alt}
                className="cap-lightbox-img"
              />

              {images.length > 1 && (
                <>
                  <button
                    className="cap-lightbox-nav prev"
                    onClick={handlePrev}
                    aria-label="Previous view"
                  >
                    <ChevronLeft size={28} />
                  </button>
                  <button
                    className="cap-lightbox-nav next"
                    onClick={handleNext}
                    aria-label="Next view"
                  >
                    <ChevronRight size={28} />
                  </button>
                </>
              )}
            </div>

            <div className="cap-lightbox-footer">
              <p className="cap-lightbox-caption">{activeImage.caption}</p>
              <div className="cap-lightbox-meta">
                <span>Press [Esc] to exit · [← / →] to navigate</span>
                <span className="cap-lightbox-count">{activeIndex + 1} / {images.length}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
