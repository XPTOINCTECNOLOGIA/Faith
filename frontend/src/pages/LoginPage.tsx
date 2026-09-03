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
import FactCheckIcon from '@mui/icons-material/FactCheck';
import GavelIcon from '@mui/icons-material/Gavel';
import LoginIcon from '@mui/icons-material/Login';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import { supabase } from '../lib/supabase';

/**
 * SSO corporativo: a sessão é do GoTrue compartilhado (mesma do Tetelestai).
 * O formulário autentica CONTRA O PROVEDOR corporativo — o portal não guarda
 * credenciais. Quando o Entra ID for habilitado no projeto, o botão de
 * provedor OIDC substitui o formulário (docs/12-integracao-tetelestai.md).
 */

const PILLARS = [
  {
    icon: <GavelIcon />,
    title: 'Governança documental',
    text: 'Nenhuma oportunidade avança de etapa sem os documentos obrigatórios aprovados (RN-001).',
  },
  {
    icon: <VerifiedUserIcon />,
    title: 'Acesso por perfil (RBAC)',
    text: 'Perfis e permissões da base corporativa, administrados na Governança do Tetelestai.',
  },
  {
    icon: <FactCheckIcon />,
    title: 'Trilha de auditoria imutável',
    text: 'Quem criou, quem alterou, o quê e quando — em cada oportunidade e documento.',
  },
];

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
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' },
        bgcolor: 'background.default',
      }}
    >
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 4,
          px: 8,
          bgcolor: '#101828',
          borderRight: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={800}>
            Portal de Oportunidades
          </Typography>
          <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 700 }}>
            XPTO + SERPRO
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1.5, maxWidth: 480 }}>
            Esteira de governança comercial e contratual da parceria: rastreabilidade total do lead à
            operação.
          </Typography>
        </Box>
        <Stack spacing={3}>
          {PILLARS.map((pillar) => (
            <Stack key={pillar.title} direction="row" spacing={2}>
              <Box sx={{ color: 'primary.main', mt: 0.25 }}>{pillar.icon}</Box>
              <Box>
                <Typography fontWeight={700}>{pillar.title}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 440 }}>
                  {pillar.text}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      </Box>

      <Box sx={{ display: 'grid', placeItems: 'center', p: 3 }}>
        <Card sx={{ width: 420, maxWidth: '92vw' }}>
          <CardContent sx={{ p: 4 }}>
            <Stack spacing={2}>
              <Typography variant="h5" fontWeight={800} textAlign="center">
                Acesso corporativo
              </Typography>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Sessão única com o Tetelestai (SSO) — use sua conta corporativa
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
                  <Button
                    type="submit"
                    variant="contained"
                    size="large"
                    disabled={loading}
                    startIcon={<LoginIcon />}
                  >
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
    </Box>
  );
}
