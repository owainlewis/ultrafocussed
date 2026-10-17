import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppErrorBoundary } from './AppErrorBoundary';
import './styles.css';
import './plan.css';
import { initialTheme } from './useTheme';
document.documentElement.dataset.theme = initialTheme();
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
