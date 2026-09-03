import { Alert, Box, CircularProgress, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { ptBR } from '@mui/material/locale';
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

/**
 * Design system "Executivo" (dark): tokens semânticos —
 * bg-primary #101828 (sidebar/topbar) · bg-surface-dim #0b1323 (canvas) ·
 * bg-surface-card #141b2c · bg-surface-elevated #1e2638 (modais/popovers) ·
 * accent #60cfe2 / hover #45b7cb · texto #f4f6fa / muted #8c9bb0 ·
 * bordas #2b4469 · estados: sucesso #10b981, atenção #f59e0b,
 * erro #ef4444, info #3b82f6.
 */
const theme = createTheme(
  {
    palette: {
      mode: 'dark',
      primary: { main: '#60cfe2', dark: '#45b7cb', contrastText: '#0b1323' },
      secondary: { main: '#8c9bb0' },
      background: { default: '#0b1323', paper: '#141b2c' },
      text: { primary: '#f4f6fa', secondary: '#8c9bb0' },
      divider: '#2b4469',
      success: { main: '#10b981' },
      warning: { main: '#f59e0b' },
      error: { main: '#ef4444' },
      info: { main: '#3b82f6' },
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: '"Manrope", "Inter", system-ui, sans-serif',
      h5: { fontWeight: 800 },
      h6: { fontWeight: 700 },
      subtitle2: { fontWeight: 700 },
      button: { textTransform: 'none', fontWeight: 700 },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: { backgroundColor: '#101828', backgroundImage: 'none', borderBottom: '1px solid #2b4469' },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: { backgroundColor: '#101828', backgroundImage: 'none', borderRight: '1px solid #2b4469' },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: { backgroundColor: '#141b2c', backgroundImage: 'none', border: '1px solid #2b4469' },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: { backgroundColor: '#1e2638', backgroundImage: 'none', border: '1px solid #2b4469' },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: { backgroundColor: '#1e2638', backgroundImage: 'none', border: '1px solid #2b4469' },
        },
      },
      MuiTableCell: {
        styleOverrides: { root: { borderColor: '#2b4469' } },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 600 } },
      },
    },
  },
  ptBR,
);

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
        <Route path="/" element={<KanbanPage />} />
        <Route path="/radar" element={<RadarPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/oportunidades/nova" element={<NewOpportunityPage />} />
        <Route path="/oportunidades/:id" element={<OpportunityPage />} />
        <Route path="/clientes" element={<ClientsPage />} />
        <Route path="/parceiros" element={<PartnersPage />} />
        <Route path="/pontos-focais" element={<FocalPointsPage />} />
        <Route path="/auditoria" element={<AuditPage />} />
        <Route path="/configuracao" element={<AdminPage />} />
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
