import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { Provider } from 'react-redux';
import { store } from './redux/store.js';
import { Toaster } from 'react-hot-toast';
import './index.css';

// 🔥 IMPORTANT IMPORTS (NEW)
import { setTokenHandler } from './redux/api/apiSlice';
import { setAccessToken } from './redux/features/authSlice';

// 🔐 CONNECT API → REDUX (NO CIRCULAR DEPENDENCY)
setTokenHandler((token) => {
  store.dispatch(setAccessToken(token));
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Provider store={store}>

      {/* 🔥 GLOBAL TOAST SYSTEM */}
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        containerStyle={{
          top: 20,
          right: 20
        }}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1f2937',
            color: '#fff',
            border: '1px solid #374151',
            borderRadius: '10px',
            padding: '12px 16px',
            fontSize: '14px'
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff'
            }
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff'
            }
          }
        }}
      />

      <App />

    </Provider>
  </React.StrictMode>
);