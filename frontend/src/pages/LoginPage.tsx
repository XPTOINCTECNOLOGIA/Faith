import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import LoginIcon from '@mui/icons-material/Login';
import { supabase } from '../lib/supabase';

/**
 * SSO corporativo: a sessão é do GoTrue compartilhado (mesma do Tetelestai).
 * O formulário abaixo autentica CONTRA O PROVEDOR corporativo — o portal não
 * guarda credenciais. Quando o Entra ID for habilitado no projeto, o botão de
 * provedor OIDC substitui o formulário (docs/12-integracao-tetelestai.md).
 */
export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) setError('Credenciais corporativas inválidas.');
    setLoading(false);
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: 'background.default' }}>
      <Card sx={{ width: 400, maxWidth: '90vw' }}>
        <CardContent sx={{ p: 4 }}>
          <Stack spacing={2}>
            <Typography variant="h5" fontWeight={700} textAlign="center">
              Portal de Oportunidades
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              XPTO INC + SERPRO — acesso com a conta corporativa (SSO com o Tetelestai)
            </Typography>
            <Divider />
            {error && <Alert severity="error">{error}</Alert>}
            <form onSubmit={handleSubmit}>
              <Stack spacing={2}>
                <TextField
                  label="E-mail corporativo"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
                />
                <TextField
                  label="Senha"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  fullWidth
                />
                <Button type="submit" variant="contained" size="large" disabled={loading} startIcon={<LoginIcon />}>
                  Entrar
                </Button>
              </Stack>
            </form>
            <Button disabled size="small">
              SSO Microsoft Entra ID — em breve
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
