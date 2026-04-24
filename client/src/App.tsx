import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import MusicKitProvider from './components/MusicKitProvider';
import { ToastProvider } from './components/primitives';
import DashboardPage from './pages/DashboardPage';
import HomePage from './pages/HomePage';
import LibraryPage from './pages/LibraryPage';
import OrganizerPage from './pages/OrganizerPage';
import SearchPage from './pages/SearchPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <MusicKitProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/library" element={<LibraryPage />} />
              <Route path="/organizer" element={<OrganizerPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </MusicKitProvider>
  );
}
