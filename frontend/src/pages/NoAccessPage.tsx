import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material';
import LockPersonIcon from '@mui/icons-material/LockPerson';
import { FaithLogo } from '../components/FaithLogo';
import { useAuth } from '../auth/AuthProvider';
import { DS } from '../theme';

/**
 * Conta autenticada e provisionada, mas sem nenhuma permissão do módulo
 * de oportunidades. Comum para usuários de outras aplicações do ecossistema
 * (ou externos ainda não liberados) — em vez de uma plataforma vazia,
 * explica a situação e aponta o caminho.
 */
export default function NoAccessPage() {
  const { me, signOut } = useAuth();

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', bgcolor: DS.navy, p: 3 }}>
      <Stack spacing={3} alignItems="center">
        <FaithLogo size={44} variant="negativo" />
        <Card sx={{ maxWidth: 460, borderRadius: 3 }}>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Box
              sx={{
                width: 56, height: 56, borderRadius: '50%', mx: 'auto', mb: 2,
                display: 'grid', placeItems: 'center', bgcolor: DS.primarySoft,
              }}
            >
              <LockPersonIcon sx={{ color: DS.ardosia }} />
            </Box>
            <Typography variant="h5" sx={{ mb: 1 }}>
              Você ainda não tem acesso ao FAITH
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              A conta <b>{me?.email}</b> está ativa no ecossistema, mas ainda não tem
              permissões do Portal de Oportunidades concedidas na Central (SHAAR).
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Solicite a concessão à Governança da XPTO — as permissões são individuais —
              e entre novamente.
            </Typography>
            <Stack direction="row" spacing={1.5} justifyContent="center">
              <Button variant="outlined" onClick={() => void signOut()}>
                Sair e trocar de conta
              </Button>
              <Button variant="contained" onClick={() => window.location.reload()}>
                Já fui liberado
              </Button>
            </Stack>
          </CardContent>
        </Card>
        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,.6)' }}>
          FAITH · Portal de Oportunidades XPTO + SERPRO
        </Typography>
      </Stack>
    </Box>
  );
}
