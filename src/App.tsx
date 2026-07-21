import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import HomePage from './pages/HomePage';

// Admin panel je odvojen chunk — posjetioci sajta ga nikad ne preuzimaju.
const AdminPage = lazy(() => import('./pages/AdminPage'));

function PageLoader() {
  return (
    <div className="min-h-screen bg-blush flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-gold" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/admin"
          element={
            <Suspense fallback={<PageLoader />}>
              <AdminPage />
            </Suspense>
          }
        />
        {/* Nepoznata putanja vodi na početnu umjesto na praznu stranicu. */}
        <Route path="*" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}
