import React, { createContext, useContext, useReducer, useEffect, useState, useCallback } from 'react';
import { AuctionDetail, FeaturedImage, AuctionLink, AuctionExpense } from '../types/auctionDetail';
import { auctionService } from '../services/auctionService';

interface ValidationErrors {
  name?: string;
  startDate?: string;
  endDate?: string;
  currency?: string;
}

type Action =
  | { type: 'SET_AUCTION'; payload: AuctionDetail }
  | { type: 'UPDATE_FIELD'; field: keyof AuctionDetail; value: any }
  | { type: 'UPDATE_SHIPPING'; field: string; value: any }
  | { type: 'UPDATE_LOT_DEFAULTS'; field: string; value: string }
  | { type: 'UPDATE_UPLOAD_SETTINGS'; field: string; value: any }
  | { type: 'ADD_FEATURED_IMAGE'; image: FeaturedImage }
  | { type: 'REMOVE_FEATURED_IMAGE'; id: string }
  | { type: 'REORDER_FEATURED_IMAGES'; images: FeaturedImage[] }
  | { type: 'ADD_AUCTION_LINK'; link: AuctionLink }
  | { type: 'UPDATE_AUCTION_LINK'; index: number; link: AuctionLink }
  | { type: 'REMOVE_AUCTION_LINK'; index: number }
  | { type: 'ADD_EXPENSE'; expense: AuctionExpense }
  | { type: 'UPDATE_EXPENSE'; id: string; expense: Partial<AuctionExpense> }
  | { type: 'REMOVE_EXPENSE'; id: string }
  | { type: 'RESET_DIRTY' };

interface AuctionDetailState {
  data: AuctionDetail | null;
  isDirty: boolean;
  errors: ValidationErrors;
}

const initialState: AuctionDetailState = {
  data: null,
  isDirty: false,
  errors: {}
};

function auctionDetailReducer(state: AuctionDetailState, action: Action): AuctionDetailState {
  if (action.type === 'SET_AUCTION') {
    return {
      data: action.payload,
      isDirty: false,
      errors: {}
    };
  }

  if (!state.data) return state;

  switch (action.type) {
    case 'UPDATE_FIELD':
      return {
        ...state,
        data: {
          ...state.data,
          [action.field]: action.value
        },
        isDirty: true
      };

    case 'UPDATE_SHIPPING':
      return {
        ...state,
        data: {
          ...state.data,
          [action.field]: action.value
        },
        isDirty: true
      };

    case 'UPDATE_LOT_DEFAULTS':
      return {
        ...state,
        data: {
          ...state.data,
          lotDefaults: {
            ...state.data.lotDefaults,
            [action.field]: action.value
          }
        },
        isDirty: true
      };

    case 'UPDATE_UPLOAD_SETTINGS':
      return {
        ...state,
        data: {
          ...state.data,
          uploadSettings: {
            ...state.data.uploadSettings,
            [action.field]: action.value
          }
        },
        isDirty: true
      };

    case 'ADD_FEATURED_IMAGE':
      return {
        ...state,
        data: {
          ...state.data,
          featuredImages: [...state.data.featuredImages, action.image]
        },
        isDirty: true
      };

    case 'REMOVE_FEATURED_IMAGE':
      return {
        ...state,
        data: {
          ...state.data,
          featuredImages: state.data.featuredImages.filter(img => img.id !== action.id)
        },
        isDirty: true
      };

    case 'REORDER_FEATURED_IMAGES':
      return {
        ...state,
        data: {
          ...state.data,
          featuredImages: action.images
        },
        isDirty: true
      };

    case 'ADD_AUCTION_LINK':
      return {
        ...state,
        data: {
          ...state.data,
          auctionLinks: [...state.data.auctionLinks, action.link]
        },
        isDirty: true
      };

    case 'UPDATE_AUCTION_LINK': {
      const links = [...state.data.auctionLinks];
      links[action.index] = action.link;
      return {
        ...state,
        data: {
          ...state.data,
          auctionLinks: links
        },
        isDirty: true
      };
    }

    case 'REMOVE_AUCTION_LINK':
      return {
        ...state,
        data: {
          ...state.data,
          auctionLinks: state.data.auctionLinks.filter((_, idx) => idx !== action.index)
        },
        isDirty: true
      };

    case 'ADD_EXPENSE':
      return {
        ...state,
        data: {
          ...state.data,
          expenses: [action.expense, ...state.data.expenses]
        },
        isDirty: true
      };

    case 'UPDATE_EXPENSE':
      return {
        ...state,
        data: {
          ...state.data,
          expenses: state.data.expenses.map(e => e.id === action.id ? { ...e, ...action.expense } : e)
        },
        isDirty: true
      };

    case 'REMOVE_EXPENSE':
      return {
        ...state,
        data: {
          ...state.data,
          expenses: state.data.expenses.filter(e => e.id !== action.id)
        },
        isDirty: true
      };

    case 'RESET_DIRTY':
      return {
        ...state,
        isDirty: false,
        errors: {}
      };

    default:
      return state;
  }
}

interface AuctionDetailContextType {
  state: AuctionDetailState;
  dispatch: React.Dispatch<Action>;
  isLoading: boolean;
  saveAuction: () => Promise<boolean>;
  validate: () => boolean;
  errors: ValidationErrors;
}

const AuctionDetailContext = createContext<AuctionDetailContextType | undefined>(undefined);

export const AuctionDetailProvider: React.FC<{
  auctionId: string;
  children: React.ReactNode;
  onSavedSuccess?: () => void;
  onSavedError?: (err: string) => void;
}> = ({ auctionId, children, onSavedSuccess, onSavedError }) => {
  const [state, dispatch] = useReducer(auctionDetailReducer, initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const loadAuction = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await auctionService.getAuctionById(auctionId);
      if (data) {
        dispatch({ type: 'SET_AUCTION', payload: data });
      }
    } catch (e) {
      console.error('Failed to load auction detail:', e);
    } finally {
      setIsLoading(false);
    }
  }, [auctionId]);

  useEffect(() => {
    loadAuction();
  }, [loadAuction]);

  const validate = (): boolean => {
    if (!state.data) return false;
    const newErrors: ValidationErrors = {};

    if (!state.data.name.trim()) {
      newErrors.name = 'Auction Name is required.';
    }
    if (!state.data.currency) {
      newErrors.currency = 'Currency selection is required.';
    }
    if (!state.data.startDate) {
      newErrors.startDate = 'Start date is required.';
    }
    if (!state.data.endDate) {
      newErrors.endDate = 'End date is required.';
    }
    if (state.data.startDate && state.data.endDate) {
      if (new Date(state.data.endDate) < new Date(state.data.startDate)) {
        newErrors.endDate = 'End date cannot be before start date.';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveAuction = async (): Promise<boolean> => {
    if (!state.data) return false;
    if (!validate()) {
      if (onSavedError) onSavedError('Please fix validation errors before saving.');
      return false;
    }

    try {
      const res = await auctionService.saveAuction(state.data);
      if (res.success) {
        dispatch({ type: 'RESET_DIRTY' });
        if (onSavedSuccess) onSavedSuccess();
        return true;
      } else {
        if (onSavedError) onSavedError(res.error || 'Failed to save auction.');
        return false;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error saving auction';
      if (onSavedError) onSavedError(msg);
      return false;
    }
  };

  return (
    <AuctionDetailContext.Provider
      value={{
        state,
        dispatch,
        isLoading,
        saveAuction,
        validate,
        errors
      }}
    >
      {children}
    </AuctionDetailContext.Provider>
  );
};

export const useAuctionDetail = () => {
  const context = useContext(AuctionDetailContext);
  if (!context) {
    throw new Error('useAuctionDetail must be used within an AuctionDetailProvider');
  }
  return context;
};
