import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiRequest } from '../api/apiSlice';

// 🔐 STEP 1 LOGIN
export const loginStep1 = createAsyncThunk(
    'auth/loginStep1',
    async (form, { rejectWithValue }) => {
        try {
            return await apiRequest({
                url: '/auth/login-step1',
                method: 'POST',
                body: form
            });
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

// 🔐 STEP 2 VERIFY
export const loginStep2 = createAsyncThunk(
    'auth/loginStep2',
    async ({ email, token }, { rejectWithValue }) => {
        try {
            return await apiRequest({
                url: '/auth/login-step2',
                method: 'POST',
                body: { email, token }
            });
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

// 🔄 AUTO LOGIN (REFRESH TOKEN)
export const refreshLogin = createAsyncThunk(
    'auth/refreshLogin',
    async (_, { rejectWithValue }) => {
        try {
            return await apiRequest({
                url: '/auth/refresh-token',
                method: 'POST'
            });
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

export const loginWithBackup = createAsyncThunk(
    'auth/loginWithBackup',
    async (form, { rejectWithValue }) => {
        try {
            return await apiRequest({
                url: '/auth/login-backup',
                method: 'POST',
                body: form,
                withCredentials: true
            });
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

const authSlice = createSlice({
    name: 'auth',
    initialState: {
        accessToken: null,
        loading: true,   // 🔥 important for auto login
        error: null
    },

    reducers: {
        logout: (state) => {
            state.accessToken = null;
        },

        setAccessToken: (state, action) => {
            state.accessToken = action.payload;
        }
    },

    extraReducers: (builder) => {
        builder

            // 🔐 LOGIN STEP 1
            .addCase(loginStep1.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginStep1.fulfilled, (state) => {
                state.loading = false;
            })
            .addCase(loginStep1.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // 🔐 LOGIN STEP 2
            .addCase(loginStep2.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(loginStep2.fulfilled, (state, action) => {
                state.loading = false;
                state.accessToken = action.payload.accessToken;
            })
            .addCase(loginStep2.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            })

            // 🔄 REFRESH LOGIN
            .addCase(refreshLogin.pending, (state) => {
                state.loading = true;
            })
            .addCase(refreshLogin.fulfilled, (state, action) => {
                state.accessToken = action.payload.accessToken;
                state.loading = false;
            })
            .addCase(refreshLogin.rejected, (state) => {
                state.accessToken = null;
                state.loading = false;
            })


            .addCase(loginWithBackup.pending, (state) => {
                state.loading = true;
            })
            .addCase(loginWithBackup.fulfilled, (state, action) => {
                state.loading = false;
                state.accessToken = action.payload.accessToken;

                // 🔥 important
                state.requiresRecovery = action.payload.requiresRecovery;
            })
            .addCase(loginWithBackup.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload;
            });
    }
});

export const { logout, setAccessToken } = authSlice.actions;
export default authSlice.reducer;