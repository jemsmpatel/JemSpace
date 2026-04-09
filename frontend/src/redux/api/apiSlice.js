let reauthCallback = null;
let setTokenCallback = null;

// 🔐 Register from outside (NO circular dependency)
export const setReauthHandler = (cb) => {
    reauthCallback = cb;
};

export const setTokenHandler = (cb) => {
    setTokenCallback = cb;
};

const BASE_URL = "http://10.229.116.181:5000/api/v1";

export const apiRequest = async ({
    url,
    method = 'GET',
    body,
    token,
    retry = true
}) => {
    const res = await fetch(BASE_URL + url, {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` })
        },
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined
    });

    // 🔥 1. TOKEN EXPIRED → REFRESH
    if (res.status === 401 && retry) {
        try {
            const refreshRes = await fetch(BASE_URL + '/auth/refresh-token', {
                method: 'POST',
                credentials: 'include'
            });

            const refreshData = await refreshRes.json();

            if (!refreshRes.ok) {
                throw new Error('Session expired');
            }

            const newToken = refreshData.accessToken;

            // ✅ SAVE TOKEN (NO store import)
            if (setTokenCallback) {
                setTokenCallback(newToken);
            }

            // 🔁 retry
            return await apiRequest({
                url,
                method,
                body,
                token: newToken,
                retry: false
            });

        } catch (err) {
            throw new Error('Session expired. Please login again');
        }
    }

    const data = await res.json();

    // 🔐 2. REAUTH REQUIRED
    if (res.status === 403 && data.message === 'Re-authentication required') {
        if (reauthCallback) {
            reauthCallback();
        }

        throw new Error('ReAuth Required');
    }

    // ❌ OTHER ERRORS
    if (!res.ok) {
        throw new Error(data.message || 'API Error');
    }

    return data;
};