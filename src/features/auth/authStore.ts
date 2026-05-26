import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { SFTokenResponse } from '../../types/salesforce';
import { refreshAccessToken } from './salesforceAuth';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  instanceUrl: string | null;
  clientId: string | null;
  orgId: string | null;
  userId: string | null;
  userDisplayName: string | null;
  userEmail: string | null;
  orgName: string | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  /** Set tokens from the OAuth callback — no user info needed yet */
  setTokens: (tokens: SFTokenResponse, clientId: string) => void;
  /** Update display name / email after fetching from instance_url */
  setUserProfile: (name: string, email: string) => void;
  clearAuth: () => void;
  refreshSession: () => Promise<void>;
  setOrgName: (name: string) => void;
}

const initialState: AuthState = {
  accessToken: null,
  refreshToken: null,
  instanceUrl: null,
  clientId: null,
  orgId: null,
  userId: null,
  userDisplayName: null,
  userEmail: null,
  orgName: null,
  isAuthenticated: false,
};

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      setTokens: (tokens: SFTokenResponse, clientId: string) => {
        // Extract org/user IDs from the Salesforce identity URL
        // Format: https://login.salesforce.com/id/{orgId}/{userId}
        const idParts = tokens.id?.split('/') || [];
        const orgId = idParts[idParts.length - 2] || null;
        const userId = idParts[idParts.length - 1] || null;

        set({
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token || null,
          instanceUrl: tokens.instance_url,
          clientId,
          orgId,
          userId,
          isAuthenticated: true,
        });
      },

      setUserProfile: (name: string, email: string) => set({ userDisplayName: name, userEmail: email }),

      clearAuth: () => {
        set(initialState);
        sessionStorage.clear();
      },

      refreshSession: async () => {
        const { instanceUrl, clientId, refreshToken } = get();
        if (!instanceUrl || !clientId || !refreshToken) {
          throw new Error('No refresh token available. Please log in again.');
        }
        const tokens = await refreshAccessToken(instanceUrl, clientId, refreshToken);
        get().setTokens(tokens, clientId);
      },

      setOrgName: (name: string) => set({ orgName: name }),
    }),
    {
      name: 'sf-auth',
      storage: createJSONStorage(() => sessionStorage),
      // Don't persist the access token itself in a recoverable way — keep in memory
      // but sessionStorage is OK for tab-lifetime tokens
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        instanceUrl: state.instanceUrl,
        clientId: state.clientId,
        orgId: state.orgId,
        userId: state.userId,
        userDisplayName: state.userDisplayName,
        userEmail: state.userEmail,
        orgName: state.orgName,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
