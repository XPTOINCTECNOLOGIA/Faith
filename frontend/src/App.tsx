import { Alert, Box, CircularProgress, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { ptBR } from '@mui/material/locale';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthProvider';
import Layout from './components/Layout';
import AdminPage from './pages/AdminPage';
import AuditPage from './pages/AuditPage';
import ClientsPage from './pages/ClientsPage';
import DashboardPage from './pages/DashboardPage';
import KanbanPage from './pages/KanbanPage';
import LoginPage from './pages/LoginPage';
import NewOpportunityPage from './pages/NewOpportunityPage';
import OpportunityPage from './pages/OpportunityPage';
import PartnersPage from './pages/PartnersPage';

const theme = createTheme(
  {
    palette: {
      primary: { main: '#123a6b' },
      secondary: { main: '#00695c' },
      background: { default: '#f4f5f7' },
    },
    shape: { borderRadius: 8 },
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
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/oportunidades/nova" element={<NewOpportunityPage />} />
        <Route path="/oportunidades/:id" element={<OpportunityPage />} />
        <Route path="/clientes" element={<ClientsPage />} />
        <Route path="/parceiros" element={<PartnersPage />} />
        <Route path="/auditoria" element={<AuditPage />} />
        <Route path="/configuracao" element={<AdminPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Gate />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
