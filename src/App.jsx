import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext.jsx';
import { AppShell }   from './components/layout/Layout.jsx';
import ConsultaPage   from './pages/ConsultaPage.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/"               element={<ConsultaPage />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
    </AppProvider>
  );
}
