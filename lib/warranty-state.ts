/**
 * Warranty State Management
 * Global state management for warranty data with caching and optimistic updates
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getWarrantyApiClient } from './warranty-api-client';
import type { WarrantyRegistration } from '@/app/actions/warranty';

export interface WarrantyStatusData {
  registered: boolean;
  warranty_id?: number;
  registration_date?: string;
  status?: string;
  expiry_date?: string;
  last_updated?: string;
}

export interface WarrantyState {
  // Cache version for invalidation
  cacheVersion?: string;
  
  // Warranty registrations cache
  registrations: Record<string, WarrantyRegistration>;
  
  // Asset warranty status cache
  assetStatuses: Record<string, WarrantyStatusData>;
  
  // Loading states
  loadingRegistrations: boolean;
  loadingAssetStatus: Record<string, boolean>;
  
  // Error states
  registrationErrors: Record<string, string>;
  statusErrors: Record<string, string>;
  
  // Cache timestamps
  lastRegistrationsFetch?: number;
  assetStatusTimestamps: Record<string, number>;
  
  // Actions
  setRegistrations: (registrations: WarrantyRegistration[]) => void;
  addRegistration: (registration: WarrantyRegistration) => void;
  updateRegistration: (id: number, updates: Partial<WarrantyRegistration>) => void;
  removeRegistration: (id: number) => void;
  
  setAssetStatus: (assetId: string, status: WarrantyStatusData) => void;
  setAssetStatusLoading: (assetId: string, loading: boolean) => void;
  setAssetStatusError: (assetId: string, error: string | null) => void;
  
  setRegistrationsLoading: (loading: boolean) => void;
  setRegistrationError: (id: string, error: string | null) => void;
  
  // Cache management
  clearCache: () => void;
  clearAssetStatusCache: (assetId?: string) => void;
  isAssetStatusCacheValid: (assetId: string, maxAge?: number) => boolean;
  isRegistrationsCacheValid: (maxAge?: number) => boolean;
  
  // Optimistic updates
  optimisticRegisterAsset: (assetId: string, assetName: string) => void;
  revertOptimisticUpdate: (assetId: string) => void;
}

const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes (reduced from 5 minutes)
const REGISTRATION_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes (reduced from 10 minutes)
const CACHE_VERSION = '1.4'; // Increment this to invalidate all cached data

export const useWarrantyStore = create<WarrantyState>()(
  persist(
    (set, get) => ({
      // Initial state
      cacheVersion: CACHE_VERSION,
      registrations: {},
      assetStatuses: {},
      loadingRegistrations: false,
      loadingAssetStatus: {},
      registrationErrors: {},
      statusErrors: {},
      assetStatusTimestamps: {},
      
      // Registration management
      setRegistrations: (registrations) => {
        const registrationsMap = registrations.reduce((acc, reg) => {
          acc[reg.id.toString()] = reg;
          return acc;
        }, {} as Record<string, WarrantyRegistration>);
        
        set({
          registrations: registrationsMap,
          lastRegistrationsFetch: Date.now(),
          registrationErrors: {},
        });
      },
      
      addRegistration: (registration) => {
        set((state) => ({
          registrations: {
            ...state.registrations,
            [registration.id.toString()]: registration,
          },
          // Also update asset status cache
          assetStatuses: {
            ...state.assetStatuses,
            [registration.asset_id]: {
              registered: true,
              warranty_id: registration.id,
              registration_date: registration.registration_date,
              status: registration.status,
              last_updated: new Date().toISOString(),
            },
          },
          assetStatusTimestamps: {
            ...state.assetStatusTimestamps,
            [registration.asset_id]: Date.now(),
          },
        }));
      },
      
      updateRegistration: (id, updates) => {
        set((state) => {
          const registration = state.registrations[id.toString()];
          if (!registration) return state;
          
          const updatedRegistration = { ...registration, ...updates };
          
          return {
            registrations: {
              ...state.registrations,
              [id.toString()]: updatedRegistration,
            },
            // Update asset status if this registration affects it
            assetStatuses: {
              ...state.assetStatuses,
              [registration.asset_id]: {
                ...state.assetStatuses[registration.asset_id],
                status: updatedRegistration.status,
                last_updated: new Date().toISOString(),
              },
            },
            assetStatusTimestamps: {
              ...state.assetStatusTimestamps,
              [registration.asset_id]: Date.now(),
            },
          };
        });
      },
      
      removeRegistration: (id) => {
        set((state) => {
          const registration = state.registrations[id.toString()];
          if (!registration) return state;
          
          const { [id.toString()]: removed, ...remainingRegistrations } = state.registrations;
          
          return {
            registrations: remainingRegistrations,
            // Update asset status to reflect removal
            assetStatuses: {
              ...state.assetStatuses,
              [registration.asset_id]: {
                registered: false,
                last_updated: new Date().toISOString(),
              },
            },
            assetStatusTimestamps: {
              ...state.assetStatusTimestamps,
              [registration.asset_id]: Date.now(),
            },
          };
        });
      },
      
      // Asset status management
      setAssetStatus: (assetId, status) => {
        set((state) => {
          // Check if the status has actually changed to prevent unnecessary updates
          const currentStatus = state.assetStatuses[assetId];
          const newStatus = {
            ...status,
            last_updated: new Date().toISOString(),
          };
          
          // Only update if the status has actually changed
          if (currentStatus && 
              currentStatus.registered === newStatus.registered &&
              currentStatus.warranty_id === newStatus.warranty_id &&
              currentStatus.status === newStatus.status) {
            return state; // No change, return current state
          }
          
          return {
            assetStatuses: {
              ...state.assetStatuses,
              [assetId]: newStatus,
            },
            assetStatusTimestamps: {
              ...state.assetStatusTimestamps,
              [assetId]: Date.now(),
            },
            statusErrors: {
              ...state.statusErrors,
              [assetId]: '',
            },
          };
        });
      },
      
      setAssetStatusLoading: (assetId, loading) => {
        set((state) => ({
          loadingAssetStatus: {
            ...state.loadingAssetStatus,
            [assetId]: loading,
          },
        }));
      },
      
      setAssetStatusError: (assetId, error) => {
        set((state) => ({
          statusErrors: {
            ...state.statusErrors,
            [assetId]: error || '',
          },
          loadingAssetStatus: {
            ...state.loadingAssetStatus,
            [assetId]: false,
          },
        }));
      },
      
      // Loading and error management
      setRegistrationsLoading: (loading) => {
        set({ loadingRegistrations: loading });
      },
      
      setRegistrationError: (id, error) => {
        set((state) => ({
          registrationErrors: {
            ...state.registrationErrors,
            [id]: error || '',
          },
        }));
      },
      
      // Cache management
      clearCache: () => {
        set({
          registrations: {},
          assetStatuses: {},
          assetStatusTimestamps: {},
          lastRegistrationsFetch: undefined,
          registrationErrors: {},
          statusErrors: {},
        });
      },
      
      clearAssetStatusCache: (assetId) => {
        if (assetId) {
          set((state) => {
            const { [assetId]: removedStatus, ...remainingStatuses } = state.assetStatuses;
            const { [assetId]: removedTimestamp, ...remainingTimestamps } = state.assetStatusTimestamps;
            const { [assetId]: removedError, ...remainingErrors } = state.statusErrors;
            
            return {
              assetStatuses: remainingStatuses,
              assetStatusTimestamps: remainingTimestamps,
              statusErrors: remainingErrors,
            };
          });
        } else {
          set({
            assetStatuses: {},
            assetStatusTimestamps: {},
            statusErrors: {},
          });
        }
      },
      
      isAssetStatusCacheValid: (assetId, maxAge = CACHE_DURATION) => {
        const state = get();
        const timestamp = state.assetStatusTimestamps[assetId];
        return Boolean(timestamp && (Date.now() - timestamp) < maxAge);
      },
      
      isRegistrationsCacheValid: (maxAge = REGISTRATION_CACHE_DURATION) => {
        const state = get();
        return Boolean(state.lastRegistrationsFetch && (Date.now() - state.lastRegistrationsFetch) < maxAge);
      },
      
      // Optimistic updates
      optimisticRegisterAsset: (assetId, assetName) => {
        const optimisticId = `temp_${Date.now()}`;
        const optimisticRegistration: WarrantyRegistration = {
          id: parseInt(optimisticId),
          asset_id: assetId,
          asset_name: assetName,
          user_email: '',
          registration_date: new Date().toISOString(),
          status: 'pending',
          warranty_period_months: 12,
          notes: 'Registration in progress...',
        };
        
        set((state) => ({
          registrations: {
            ...state.registrations,
            [optimisticId]: optimisticRegistration,
          },
          assetStatuses: {
            ...state.assetStatuses,
            [assetId]: {
              registered: true,
              warranty_id: parseInt(optimisticId),
              registration_date: new Date().toISOString(),
              status: 'pending',
              last_updated: new Date().toISOString(),
            },
          },
          assetStatusTimestamps: {
            ...state.assetStatusTimestamps,
            [assetId]: Date.now(),
          },
        }));
      },
      
      revertOptimisticUpdate: (assetId) => {
        set((state) => {
          // Find and remove optimistic registration
          const optimisticEntries = Object.entries(state.registrations).filter(
            ([id, reg]) => reg.asset_id === assetId && id.startsWith('temp_')
          );
          
          const updatedRegistrations = { ...state.registrations };
          optimisticEntries.forEach(([id]) => {
            delete updatedRegistrations[id];
          });
          
          // Revert asset status
          const { [assetId]: removedStatus, ...remainingStatuses } = state.assetStatuses;
          const { [assetId]: removedTimestamp, ...remainingTimestamps } = state.assetStatusTimestamps;
          
          return {
            registrations: updatedRegistrations,
            assetStatuses: remainingStatuses,
            assetStatusTimestamps: remainingTimestamps,
          };
        });
      },
    }),
    {
      name: 'warranty-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist registrations cache, NOT asset status cache for live data
        cacheVersion: state.cacheVersion,
        registrations: state.registrations,
        lastRegistrationsFetch: state.lastRegistrationsFetch,
        // Exclude assetStatuses and assetStatusTimestamps from persistence
        // This ensures warranty status is always fetched fresh
      }),
      // Check cache version and clear if outdated
      onRehydrateStorage: () => (state) => {
        if (state && state.cacheVersion !== CACHE_VERSION) {
          console.log('Warranty cache version mismatch, clearing cache');
          // Clear the cache by resetting to initial state
          state.registrations = {};
          state.lastRegistrationsFetch = undefined;
          state.cacheVersion = CACHE_VERSION;
        }
        // Always start with empty asset status cache for fresh data
        if (state) {
          state.assetStatuses = {};
          state.assetStatusTimestamps = {};
        }
      },
    }
  )
);

/**
 * Hook for warranty registrations with automatic caching
 */
export const useWarrantyRegistrations = () => {
  const store = useWarrantyStore();
  
  const fetchRegistrations = async (force = false) => {
    if (!force && store.isRegistrationsCacheValid()) {
      return Object.values(store.registrations);
    }
    
    store.setRegistrationsLoading(true);
    
    try {
      // Use direct API client for faster response times
      const apiClient = getWarrantyApiClient();
      const registrations = await apiClient.getWarrantyRegistrations();
      store.setRegistrations(registrations);
      return registrations;
    } catch (error) {
      console.error('Failed to fetch warranty registrations:', error);
      throw error;
    } finally {
      store.setRegistrationsLoading(false);
    }
  };
  
  return {
    registrations: Object.values(store.registrations),
    loading: store.loadingRegistrations,
    errors: store.registrationErrors,
    fetchRegistrations,
    addRegistration: store.addRegistration,
    updateRegistration: store.updateRegistration,
    removeRegistration: store.removeRegistration,
  };
};

/**
 * Hook for asset warranty status with automatic caching
 */
export const useAssetWarrantyStatus = (assetId: string) => {
  const store = useWarrantyStore();
  
  const fetchStatus = async (force = true) => {
    // ALWAYS fetch fresh data - no caching for warranty status to ensure live data
    // Only skip if currently loading to prevent duplicate requests
    if (store.loadingAssetStatus[assetId] && !force) {
      return store.assetStatuses[assetId];
    }
    
    // Prevent duplicate requests by checking if already loading
    if (store.loadingAssetStatus[assetId]) {
      console.log(`[WarrantyState] Already loading status for asset ${assetId}, skipping duplicate request`);
      return store.assetStatuses[assetId];
    }
    
    store.setAssetStatusLoading(assetId, true);
    
    try {
      // Use direct API client for faster response times
      const apiClient = getWarrantyApiClient();
      const result = await apiClient.checkWarrantyStatus(assetId);
      
      const statusData: WarrantyStatusData = {
        registered: result.registered,
        warranty_id: result.warranty_id,
        registration_date: result.registration_date,
        status: result.status,
      };
      
      store.setAssetStatus(assetId, statusData);
      return statusData;
    } catch (error) {
      let errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Handle specific error types more gracefully
      if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
        errorMessage = 'Connection timeout - service may be temporarily unavailable';
      } else if (errorMessage.includes('Failed to fetch')) {
        errorMessage = 'Network error - please check your connection';
      }
      
      store.setAssetStatusError(assetId, errorMessage);
      throw new Error(errorMessage);
    } finally {
      store.setAssetStatusLoading(assetId, false);
    }
  };
  
  return {
    status: store.assetStatuses[assetId],
    loading: store.loadingAssetStatus[assetId] || false,
    error: store.statusErrors[assetId],
    fetchStatus,
    clearCache: () => store.clearAssetStatusCache(assetId),
  };
};