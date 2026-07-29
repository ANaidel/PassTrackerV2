import React from 'react';
import ReactDOM from 'react-dom/client';
import { Analytics } from '@vercel/analytics/react';
import App from './App';
import PwaUpdateBanner from './PwaUpdateBanner';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <PwaUpdateBanner />
    <Analytics />
  </React.StrictMode>
);
