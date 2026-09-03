import { Alert, Box, CircularProgress, CssBaseline, ThemeProvider } from '@mui/material';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import Layout from './components/Layout';
import AdminPage from './pages/AdminPage';
import AuditPage from './pages/AuditPage';
import ClientsPage from './pages/ClientsPage';
import DashboardPage from './pages/DashboardPage';
import FocalPointsPage from './pages/FocalPointsPage';
import KanbanPage from './pages/KanbanPage';
import LoginPage from './pages/LoginPage';
import NewOpportunityPage from './pages/NewOpportunityPage';
import OpportunityPage from './pages/OpportunityPage';
import PartnersPage from './pages/PartnersPage';
import RadarPage from './pages/RadarPage';
import { theme } from './theme';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

function Gate() {
  const { session, sessionLoading, me, meError } = useAuth();

  if (sessionLoading) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }
  if (!session) return <LoginPage />;
  if (meError) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', p: 3 }}>
        <Alert severity="error">
          {meError.includes('provisionado')
            ? 'Sua conta corporativa ainda não está provisionada para o portal. Procure a Governança.'
            : meError}
        </Alert>
      </Box>
    );
  }
  if (!me) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/oportunidades" element={<RadarPage />} />
        <Route path="/pipeline" element={<KanbanPage />} />
        <Route path="/oportunidades/nova" element={<NewOpportunityPage />} />
        <Route path="/oportunidades/:id" element={<OpportunityPage />} />
        <Route path="/orgaos" element={<ClientsPage />} />
        <Route path="/parceiros" element={<PartnersPage />} />
        <Route path="/pontos-focais" element={<FocalPointsPage />} />
        <Route path="/auditoria" element={<AuditPage />} />
        <Route path="/configuracao" element={<AdminPage />} />
        {/* rotas legadas */}
        <Route path="/radar" element={<Navigate to="/oportunidades" replace />} />
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/clientes" element={<Navigate to="/orgaos" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

// Hospedagens sem rewrite de SPA (ex.: Storage público do Supabase servindo
// index.html) usam HashRouter — navegação e refresh funcionam em qualquer
// caminho. Em hosts com rewrite (Vercel, K8s/Nginx, dev) fica o BrowserRouter.
const useHash = window.location.pathname.includes('/storage/v1/object/');
const Router = useHash ? HashRouter : BrowserRouter;

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <Router>
            <Gate />
          </Router>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
