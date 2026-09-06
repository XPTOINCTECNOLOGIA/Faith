import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  LinearProgress,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PublicIcon from '@mui/icons-material/Public';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import GeoMap from '../components/GeoMap';
import { api } from '../lib/api';
import { brl0, buildPinGroups, type PinGroup } from '../lib/geo';
import { type RadarOpportunity } from '../lib/types';
import { DS, STATE_SOFT } from '../theme';

export default function MapPage() {
  const [escopo, setEscopo] = useState<'todas' | 'brasil' | 'internacional'>('todas');
  const [sel, setSel] = useState<PinGroup | null>(null);
  const [params] = useSearchParams();
  const pinAplicado = useRef(false);

  const radar = useQuery({
    queryKey: ['radar', '', '', ''],
    queryFn: () => api.get<RadarOpportunity[]>('/radar'),
  });

  const groups = useMemo(() => {
    const items = (radar.data ?? []).filter((r) =>
      escopo === 'todas' ? true : escopo === 'brasil' ? r.pais === 'Brasil' : r.pais !== 'Brasil',
    );
    return buildPinGroups(items);
  }, [radar.data, escopo]);

  // Vindo do Dashboard com ?pin=lat,lng: abre o painel da região direto,
  // sem exigir um segundo clique aqui.
  useEffect(() => {
    const pin = params.get('pin');
    if (!pin || pinAplicado.current || groups.length === 0) return;
    const g = groups.find((x) => x.key === pin);
    if (g) {
      setSel(g);
      pinAplicado.current = true;
    }
  }, [params, groups]);

  const totalGeral = groups.reduce((a, g) => a + g.total, 0);
  const nOportunidades = groups.reduce((a, g) => a + g.items.length, 0);

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 0.5 }}>
        <Typography variant="h4">Mapa Global</Typography>
        <Box sx={{ flexGrow: 1 }} />
        <ToggleButtonGroup size="small" exclusive value={escopo} onChange={(_e, v) => v && setEscopo(v)}>
          <ToggleButton value="todas">Todas</ToggleButton>
          <ToggleButton value="brasil">Brasil</ToggleButton>
          <ToggleButton value="internacional">Internacional</ToggleButton>
        </ToggleButtonGroup>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {nOportunidades} oportunidade{nOportunidades === 1 ? '' : 's'} em {groups.length}{' '}
        localidade{groups.length === 1 ? '' : 's'} · {brl0(totalGeral)} estimados — clique em um pin
        para ver o detalhe
      </Typography>

      {radar.isLoading && <LinearProgress sx={{ mb: 2 }} />}
      {radar.error && <Alert severity="error">Falha ao carregar as oportunidades.</Alert>}

      <Box
        sx={{
          position: 'relative',
          height: { xs: 460, md: 600 },
          borderRadius: 3,
          overflow: 'hidden',
          border: '1px solid',
          borderColor: 'divider',
          boxShadow: DS.shadowXs,
        }}
      >
        <GeoMap groups={groups} onPinClick={setSel} />

        {/* Legenda */}
        <Card sx={{ position: 'absolute', left: 12, bottom: 12, zIndex: 1000 }}>
          <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: DS.ciano }} />
                <Typography variant="caption">Em prospecção</Typography>
              </Stack>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: DS.ardosia }} />
                <Typography variant="caption">100% no Pipeline</Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Painel do pin selecionado */}
        {sel && (
          <Card
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 1000,
              width: { xs: 'calc(100% - 24px)', sm: 380 },
              maxHeight: 'calc(100% - 24px)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: DS.shadowMd,
            }}
          >
            <CardContent sx={{ pb: 1.5, '&:last-child': { pb: 1.5 }, overflowY: 'auto' }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <PublicIcon fontSize="small" sx={{ color: DS.ardosia }} />
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  {sel.titulo}
                </Typography>
                <IconButton size="small" onClick={() => setSel(null)} aria-label="Fechar painel">
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
                {sel.items.length} oportunidade{sel.items.length === 1 ? '' : 's'} · {brl0(sel.total)} estimados ·{' '}
                {sel.promovidas} no Pipeline
              </Typography>

              <Stack spacing={1.25}>
                {sel.items.map((r) => {
                  const st = r.pipeline
                    ? r.pipeline.status === 'ganha'
                      ? STATE_SOFT.success
                      : STATE_SOFT.info
                    : STATE_SOFT.neutral;
                  return (
                    <Box key={r.id} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.25 }}>
                      <Typography variant="body2" fontWeight={700}>
                        {r.orgao_responsavel !== 'Não informado' ? r.orgao_responsavel : r.objeto}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                        {r.orgao_responsavel !== 'Não informado' ? `${r.objeto} · ` : ''}
                        {r.valor_estimado_total_contrato}
                        {r.tempo_contrato !== 'Não informado' ? ` · ${r.tempo_contrato}` : ''}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          size="small"
                          label={r.pipeline ? `${r.pipeline.code} · ${r.pipeline.stage?.name ?? ''}` : 'Prospecção'}
                          sx={{ bgcolor: st.bg, color: st.color }}
                        />
                        <Box sx={{ flexGrow: 1 }} />
                        {r.pipeline ? (
                          <Button
                            size="small"
                            component={Link}
                            to={`/oportunidades/${r.pipeline.id}`}
                            endIcon={<RocketLaunchIcon fontSize="small" />}
                          >
                            Abrir
                          </Button>
                        ) : (
                          <Button size="small" component={Link} to={`/oportunidades?q=${encodeURIComponent(r.objeto)}`}>
                            Detalhes
                          </Button>
                        )}
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  );
}
