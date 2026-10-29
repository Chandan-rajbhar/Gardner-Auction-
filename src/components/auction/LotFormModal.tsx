import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Upload, 
  Trash2, 
  Plus, 
  Image as ImageIcon, 
  GripVertical,
  Save,
  ArrowRight,
  Edit2
} from 'lucide-react';
import { LotItem, Auction, UserBidder } from '../../types';
import { FormModal } from '../Common/FormModal';
import { ConfirmModal } from '../Common/ConfirmModal';
import { useToast } from '../../context/ToastContext';

interface LotFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lot: LotItem) => void | Promise<void>;
  editingLot?: LotItem | null;
  lots: LotItem[];
  auctions: Auction[];
  defaultAuctionId?: string;
  lockAuction?: boolean;
  consignors?: UserBidder[];
  onAddConsignor?: (newConsignor: UserBidder) => void;
}

export const LotFormModal: React.FC<LotFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingLot,
  lots,
  auctions,
  defaultAuctionId,
  lockAuction = false,
  consignors = [],
  onAddConsignor
}) => {
  const { showToast } = useToast();

  // Active auction ID
  const [selectedAuctionId, setSelectedAuctionId] = useState<string>(
    editingLot?.auctionId || defaultAuctionId || (auctions[0]?.id || 'auc-001')
  );

  // Form fields matching reference design
  const [lotNumber, setLotNumber] = useState<number>(2018);
  const [sellerId, setSellerId] = useState<string>('');
  const [sellerName, setSellerName] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');

  // Media
  const [images, setImages] = useState<string[]>([]);
  const [draggedImgIdx, setDraggedImgIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Footer Options
  const [keepDrawerOpen, setKeepDrawerOpen] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Sub-Modals
  const [isNewSellerModalOpen, setIsNewSellerModalOpen] = useState<boolean>(false);
  const [newSellerName, setNewSellerName] = useState<string>('');
  const [newSellerEmail, setNewSellerEmail] = useState<string>('');
  const [newSellerPhone, setNewSellerPhone] = useState<string>('');
  const [newSellerCommission, setNewSellerCommission] = useState<string>('10');

  const [isTipsModalOpen, setIsTipsModalOpen] = useState<boolean>(false);
  const [isDiscardConfirmOpen, setIsDiscardConfirmOpen] = useState<boolean>(false);

  // Dirtiness tracking
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Synchronize when opening or editing
  useEffect(() => {
    if (!isOpen) {
      setIsDirty(false);
      return;
    }

    const activeAucId = editingLot?.auctionId || defaultAuctionId || (auctions[0]?.id || 'auc-001');
    setSelectedAuctionId(activeAucId);

    if (editingLot) {
      setLotNumber(editingLot.lotNumber);
      setSellerId(editingLot.sellerId || editingLot.consignorId || '');
      setSellerName(editingLot.sellerName || editingLot.consignorName || '');
      setQuantity(editingLot.quantity || 1);
      setTitle(editingLot.title || '');
      setDescription(editingLot.description || editingLot.conditionReport || '');

      const existingImgs = editingLot.images && editingLot.images.length > 0
        ? [...editingLot.images]
        : editingLot.image
          ? [editingLot.image]
          : [];
      setImages(existingImgs);
      setIsDirty(false);
    } else {
      // Find next free lot number for this auction
      const auctionLots = lots.filter(l => !l.auctionId || l.auctionId === activeAucId);
      const maxLotNum = auctionLots.reduce((max, l) => (l.lotNumber > max ? l.lotNumber : max), 100);
      setLotNumber(maxLotNum + 1);

      setSellerId('');
      setSellerName('');
      setQuantity(1);
      setTitle('');
      setDescription('');
      setImages([]);
      setIsDirty(false);
    }
  }, [isOpen, editingLot, defaultAuctionId, auctions]);


  // Drag and drop image upload
  const processFiles = (files: FileList) => {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (validFiles.length === 0) return;

    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImages(prev => [...prev, reader.result as string]);
          setIsDirty(true);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDropFiles = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDragOverFiles = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
    setIsDirty(true);
  };

  const handleImgDragStart = (idx: number) => {
    setDraggedImgIdx(idx);
  };

  const handleImgDrop = (targetIdx: number) => {
    if (draggedImgIdx === null || draggedImgIdx === targetIdx) return;
    setImages(prev => {
      const updated = [...prev];
      const [moved] = updated.splice(draggedImgIdx, 1);
      updated.splice(targetIdx, 0, moved);
      return updated;
    });
    setDraggedImgIdx(null);
    setIsDirty(true);
  };

  const handleMoveImage = (idx: number, direction: 'left' | 'right') => {
    const targetIdx = direction === 'left' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= images.length) return;
    setImages(prev => {
      const updated = [...prev];
      const temp = updated[idx];
      updated[idx] = updated[targetIdx];
      updated[targetIdx] = temp;
      return updated;
    });
    setIsDirty(true);
  };

  // Validation
  const isLotNumberDuplicate = lots.some(l => 
    l.lotNumber === Number(lotNumber) && 
    (!l.auctionId || l.auctionId === selectedAuctionId) &&
    (!editingLot || l.id !== editingLot.id)
  );
  const isLotNumberInvalid = !lotNumber || lotNumber <= 0 || isLotNumberDuplicate;
  const isTitleInvalid = !title.trim();
  const isFormValid = !isLotNumberInvalid && !isTitleInvalid;

  // Build LotItem object
  const buildLotObject = (): LotItem => {
    const primaryImg = images.length > 0 
      ? images[0] 
      : (editingLot?.image || 'https://images.unsplash.com/photo-1610375461246-83df859d849d?w=800&auto=format&fit=crop&q=80');

    return {
      id: editingLot?.id || `lot-${Date.now()}`,
      auctionId: selectedAuctionId,
      lotNumber: Number(lotNumber),
      title: title.trim(),
      category: editingLot?.category || 'Rare US Gold',
      image: primaryImg,
      images: images.length > 0 ? images : [primaryImg],
      startingBid: editingLot?.startingBid ?? 100,
      reservePrice: editingLot?.reservePrice ?? 0,
      estimateLow: editingLot?.estimateLow ?? 0,
      estimateHigh: editingLot?.estimateHigh ?? 0,
      currentBid: editingLot?.currentBid ?? (editingLot?.startingBid ?? 100),
      highBidderPaddle: editingLot?.highBidderPaddle ?? null,
      highBidderName: editingLot?.highBidderName ?? null,
      status: editingLot?.status || 'upcoming',
      certification: editingLot?.certification || 'Raw',
      grade: editingLot?.grade || '',
      certNumber: editingLot?.certNumber || undefined,
      consignorId: sellerId || editingLot?.consignorId || 'c-default',
      consignorName: sellerName || editingLot?.consignorName || 'Gardner House Consignor',
      conditionReport: description.trim() || editingLot?.conditionReport || '',
      provenance: editingLot?.provenance || 'Private Numismatic Collection; Gardner Verified.',
      bidsCount: editingLot?.bidsCount ?? 0,
      quantity: quantity || 1,
      description: description.trim(),
      sellerId: sellerId || undefined,
      sellerName: sellerName || undefined,
      saleOrder: editingLot?.saleOrder ?? Number(lotNumber),
      staggerSeconds: editingLot?.staggerSeconds ?? 20
    };
  };

  // Save and Close (SAVE / EDIT)
  const handleSaveAndClose = async () => {
    if (!isFormValid || isSaving) return;
    setIsSaving(true);
    try {
      const lotToSave = buildLotObject();
      await onSave(lotToSave);
      showToast(
        'success',
        editingLot ? 'Lot Updated' : 'Lot Saved',
        `Lot #${lotToSave.lotNumber} (${lotToSave.title}) saved successfully.`
      );
      setIsDirty(false);
      onClose();
    } catch (e) {
      showToast('error', 'Save Failed', 'Unable to save lot. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Save and Next (SAVE / NEXT)
  const handleSaveAndNext = async () => {
    if (!isFormValid || isSaving) return;
    setIsSaving(true);
    try {
      const lotToSave = buildLotObject();
      await onSave(lotToSave);
      showToast(
        'success',
        'Lot Created',
        `Lot #${lotToSave.lotNumber} saved. Ready for next entry.`
      );

      // Increment lot number
      setLotNumber(prev => Number(prev) + 1);
      setTitle('');
      setDescription('');
      setImages([]);
      setQuantity(1);
      // Keep seller if checkbox is checked
      if (!keepDrawerOpen) {
        setSellerId('');
        setSellerName('');
      }
      setIsDirty(false);
    } catch (e) {
      showToast('error', 'Save Failed', 'Unable to save lot. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Close handler with dirty check
  const handleRequestClose = () => {
    if (isDirty) {
      setIsDiscardConfirmOpen(true);
    } else {
      onClose();
    }
  };

  // Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        if (isNewSellerModalOpen) {
          setIsNewSellerModalOpen(false);
        } else if (isTipsModalOpen) {
          setIsTipsModalOpen(false);
        } else if (isDiscardConfirmOpen) {
          setIsDiscardConfirmOpen(false);
        } else {
          handleRequestClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDirty, isTipsModalOpen, isDiscardConfirmOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* 1. Backdrop Overlay */}
      <div 
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.45)',
          backdropFilter: 'blur(2px)',
          zIndex: 1040,
          transition: 'opacity 0.25s ease'
        }}
        onClick={handleRequestClose}
      />

      {/* 2. Slide-Over Drawer Panel (Opens from the Right Side) */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 720,
          maxWidth: '96vw',
          height: '100vh',
          background: '#ffffff',
          zIndex: 1050,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-6px 0 28px rgba(0, 0, 0, 0.2)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#ffffff',
          flexShrink: 0
        }}>
          <h2 style={{
            fontSize: 22,
            fontWeight: 700,
            color: '#0f172a',
            margin: 0,
            fontFamily: 'var(--font-serif, "Cinzel", Georgia, serif)'
          }}>
            {editingLot ? `Edit Lot #${editingLot.lotNumber}` : 'New Lot'}
          </h2>
          <button
            type="button"
            onClick={handleRequestClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 6,
              color: '#94a3b8',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#0f172a'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#94a3b8'}
            title="Close (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Body (Scrollable) */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px 24px',
          background: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          gap: 20
        }}>
          {/* CARD 1: LOT INFO */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '20px 22px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <h3 style={{
              fontSize: 15,
              fontWeight: 700,
              color: '#0f172a',
              margin: '0 0 16px',
              paddingBottom: 10,
              borderBottom: '1px solid #e2e8f0'
            }}>
              Lot Info
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Lot Number */}
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: 16 }}>
                <label style={{ fontSize: 13.5, fontWeight: 700, color: '#334155' }}>
                  Lot Number
                </label>
                <div>
                  <input
                    type="number"
                    min={1}
                    required
                    value={lotNumber || ''}
                    onChange={(e) => {
                      setLotNumber(parseInt(e.target.value) || 0);
                      setIsDirty(true);
                    }}
                    style={{
                      width: 240,
                      height: 38,
                      padding: '0 12px',
                      borderRadius: 6,
                      border: isLotNumberInvalid ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                      fontSize: 14,
                      fontFamily: 'var(--font-mono, monospace)',
                      fontWeight: 600,
                      color: '#0f172a',
                      outline: 'none',
                      background: '#ffffff'
                    }}
                    placeholder="2018"
                  />
                  {isLotNumberDuplicate && (
                    <div style={{ fontSize: 11.5, color: '#ef4444', marginTop: 4 }}>
                      Lot number must be unique within this auction.
                    </div>
                  )}
                </div>
              </div>

              {/* Quantity */}
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: 16 }}>
                <label style={{ fontSize: 13.5, fontWeight: 700, color: '#334155' }}>
                  Quantity
                </label>
                <div>
                  <input
                    type="number"
                    min={1}
                    required
                    value={quantity}
                    onChange={(e) => {
                      setQuantity(Math.max(1, parseInt(e.target.value) || 1));
                      setIsDirty(true);
                    }}
                    style={{
                      width: 240,
                      height: 38,
                      padding: '0 12px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 14,
                      fontFamily: 'var(--font-mono, monospace)',
                      fontWeight: 600,
                      color: '#0f172a',
                      outline: 'none',
                      background: '#ffffff'
                    }}
                  />
                </div>
              </div>

              {/* Title */}
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'center', gap: 16 }}>
                <label style={{ fontSize: 13.5, fontWeight: 700, color: '#334155' }}>
                  Title
                </label>
                <div>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="Enter lot title..."
                    style={{
                      width: '100%',
                      height: 38,
                      padding: '0 12px',
                      borderRadius: 6,
                      border: isTitleInvalid && isDirty ? '1.5px solid #ef4444' : '1px solid #cbd5e1',
                      fontSize: 13.5,
                      color: '#0f172a',
                      outline: 'none',
                      background: '#ffffff'
                    }}
                  />
                </div>
              </div>

              {/* Description */}
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', alignItems: 'flex-start', gap: 16 }}>
                <label style={{ fontSize: 13.5, fontWeight: 700, color: '#334155', paddingTop: 8 }}>
                  Description
                </label>
                <div>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="Enter lot specifications, historical notes, provenance..."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      fontSize: 13.5,
                      color: '#0f172a',
                      outline: 'none',
                      background: '#ffffff',
                      resize: 'vertical',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CARD 2: LOT MEDIA */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '20px 22px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
          }}>
            <h3 style={{
              fontSize: 15,
              fontWeight: 700,
              color: '#0f172a',
              margin: '0 0 16px',
              paddingBottom: 10,
              borderBottom: '1px solid #e2e8f0'
            }}>
              Lot Media
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Left Column: Image Previews */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  background: '#ffffff',
                  minHeight: 180,
                  maxHeight: 240,
                  overflowY: 'auto',
                  padding: 10
                }}>
                  {images.length === 0 ? (
                    <div style={{
                      height: 160,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#94a3b8',
                      textAlign: 'center',
                      padding: 12
                    }}>
                      <ImageIcon size={32} style={{ marginBottom: 6, opacity: 0.35 }} />
                      <span style={{ fontSize: 12, fontWeight: 500 }}>No images uploaded yet</span>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {images.map((imgUrl, idx) => (
                        <div
                          key={idx}
                          draggable
                          onDragStart={() => handleImgDragStart(idx)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleImgDrop(idx)}
                          style={{
                            position: 'relative',
                            borderRadius: 6,
                            overflow: 'hidden',
                            border: idx === 0 ? '2px solid var(--gold-primary, #cba135)' : '1px solid #cbd5e1',
                            background: '#f8fafc',
                            aspectRatio: '1 / 1',
                            cursor: 'grab',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title={`Image #${idx + 1}. Drag to reorder.`}
                        >
                          <img
                            src={imgUrl}
                            alt={`Lot scan ${idx + 1}`}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                          />
                          {idx === 0 && (
                            <span style={{
                              position: 'absolute',
                              top: 4,
                              left: 4,
                              background: '#cba135',
                              color: '#ffffff',
                              fontSize: 9,
                              fontWeight: 800,
                              padding: '1px 5px',
                              borderRadius: 3,
                              textTransform: 'uppercase'
                            }}>
                              Main
                            </span>
                          )}
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'rgba(15, 23, 42, 0.75)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '2px 4px'
                          }}>
                            <div style={{ display: 'flex', gap: 2 }}>
                              {idx > 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveImage(idx, 'left')}
                                  style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 2, fontSize: 10 }}
                                  title="Move left"
                                >
                                  ◀
                                </button>
                              )}
                              {idx < images.length - 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleMoveImage(idx, 'right')}
                                  style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 2, fontSize: 10 }}
                                  title="Move right"
                                >
                                  ▶
                                </button>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveImage(idx)}
                              style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 2 }}
                              title="Remove image"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11.5, color: '#94a3b8', fontStyle: 'italic' }}>
                  Drag images to change display order
                </div>
              </div>

              {/* Right Column: Upload Zone */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files) processFiles(e.target.files);
                  }}
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  style={{ display: 'none' }}
                />
                <div
                  onDrop={handleDropFiles}
                  onDragOver={handleDragOverFiles}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 6,
                    background: '#fafaf8',
                    minHeight: 180,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px 16px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#0f172a';
                    e.currentTarget.style.background = '#f1f5f9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.background = '#fafaf8';
                  }}
                >
                  <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, maxWidth: 220 }}>
                    Drag-and-drop files to upload or click here to browse for a file.
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <button
                    type="button"
                    onClick={() => setIsTipsModalOpen(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#475569',
                      fontSize: 12.5,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      transition: 'color 0.15s ease'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.color = '#0f172a'}
                    onMouseLeave={(e) => e.currentTarget.style.color = '#475569'}
                  >
                    Tips & Tricks
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Drawer Sticky Footer */}
        <div style={{
          padding: '14px 24px',
          background: '#ffffff',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          zIndex: 10
        }}>
          {/* Left: Checkbox */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }} title="Keep chosen seller for next created lot">
            <input
              type="checkbox"
              checked={keepDrawerOpen}
              onChange={(e) => setKeepDrawerOpen(e.target.checked)}
              style={{
                width: 17,
                height: 17,
                cursor: 'pointer',
                borderRadius: 4,
                accentColor: '#0f172a'
              }}
            />
          </label>

          {/* Right: Actions matching Image 3 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* SAVE BUTTON */}
            <button
              type="button"
              disabled={!isFormValid || isSaving}
              onClick={handleSaveAndClose}
              style={{
                height: 40,
                padding: '0 24px',
                borderRadius: 6,
                background: '#0f172a',
                color: '#ffffff',
                border: '1px solid #1e293b',
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: '0.04em',
                cursor: isFormValid && !isSaving ? 'pointer' : 'not-allowed',
                opacity: isFormValid && !isSaving ? 1 : 0.6,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                if (isFormValid && !isSaving) {
                  e.currentTarget.style.background = '#1e293b';
                  e.currentTarget.style.borderColor = '#334155';
                }
              }}
              onMouseLeave={(e) => {
                if (isFormValid && !isSaving) {
                  e.currentTarget.style.background = '#0f172a';
                  e.currentTarget.style.borderColor = '#1e293b';
                }
              }}
            >
              <Save size={15} />
              <span>{isSaving ? 'SAVING...' : 'SAVE'}</span>
            </button>

            {/* 3. CLOSE */}
            <button
              type="button"
              onClick={handleRequestClose}
              style={{
                height: 40,
                padding: '0 18px',
                borderRadius: 6,
                background: 'transparent',
                color: '#64748b',
                border: 'none',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#0f172a'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
            >
              CLOSE
            </button>
          </div>
        </div>
      </div>

      {/* Sub-Modal: Tips & Tricks */}
      <FormModal
        isOpen={isTipsModalOpen}
        title="Lot Media Tips & Tricks"
        onClose={() => setIsTipsModalOpen(false)}
        maxWidth={560}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: 13, color: '#334155', lineHeight: 1.6 }}>
          <div>
            <strong>1. Display Order:</strong> The first uploaded image is automatically set as the primary catalog thumbnail across HiBid, the rostrum monitor, and invoices.
          </div>
          <div>
            <strong>2. Image Drag & Drop:</strong> Drag any uploaded image tile in the left box to reorder it on the fly.
          </div>
          <div>
            <strong>3. Supported Formats:</strong> JPG, PNG, and WebP images up to 10MB per image are supported.
          </div>
          <div>
            <strong>4. High Resolution:</strong> 2000x2000px or higher recommended for high-magnification coin luster and slab certification inspection.
          </div>
        </div>
      </FormModal>

      {/* Discard Confirmation Modal */}
      <ConfirmModal
        isOpen={isDiscardConfirmOpen}
        title="Discard Unsaved Changes?"
        message="You have unsaved changes in this lot form. Closing will discard them."
        confirmLabel="Discard & Close"
        isDestructive={true}
        onConfirm={() => {
          setIsDiscardConfirmOpen(false);
          setIsDirty(false);
          onClose();
        }}
        onCancel={() => setIsDiscardConfirmOpen(false)}
      />
    </>
  );
};
