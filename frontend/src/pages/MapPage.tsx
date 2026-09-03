import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  GlobalStyles,
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
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { radarParseBRL, type RadarOpportunity } from '../lib/types';
import { DS, STATE_SOFT } from '../theme';

/* ── geografia ──────────────────────────────────────────────────────────────
 * Coordenadas determinísticas (sem geocodificação externa): capitais das 27
 * UFs, capitais dos países atendidos e municípios conhecidos da base.
 * Município fora da tabela cai na capital da UF.
 */

const UF_CAPITAL: Record<string, [number, number]> = {
  AC: [-9.975, -67.8243], AL: [-9.666, -35.735], AM: [-3.1019, -60.025],
  AP: [0.0349, -51.0694], BA: [-12.9718, -38.5011], CE: [-3.7172, -38.5433],
  DF: [-15.7797, -47.9297], ES: [-20.3155, -40.3128], GO: [-16.6864, -49.2643],
  MA: [-2.5307, -44.3068], MG: [-19.9167, -43.9345], MS: [-20.4697, -54.6201],
  MT: [-15.601, -56.0974], PA: [-1.455, -48.5024], PB: [-7.1151, -34.8641],
  PE: [-8.0543, -34.8813], PI: [-5.0892, -42.8016], PR: [-25.4284, -49.2733],
  RJ: [-22.9068, -43.1729], RN: [-5.7945, -35.211], RO: [-8.7608, -63.8999],
  RR: [2.8197, -60.6733], RS: [-30.0346, -51.2177], SC: [-27.5954, -48.548],
  SE: [-10.9472, -37.0731], SP: [-23.5505, -46.6333], TO: [-10.2491, -48.3243],
};

const PAIS_CAPITAL: Record<string, [number, number]> = {
  Brasil: [-15.7797, -47.9297], Guiana: [6.8013, -58.1551], Angola: [-8.839, 13.2894],
  'Moçambique': [-25.9692, 32.5732], 'Cabo Verde': [14.933, -23.5133],
  Argentina: [-34.6037, -58.3816], Paraguai: [-25.2637, -57.5759],
  Uruguai: [-34.9011, -56.1645], Chile: [-33.4489, -70.6693],
  'Colômbia': [4.711, -74.0721], Peru: [-12.0464, -77.0428],
  Portugal: [38.7223, -9.1393], 'Estados Unidos': [38.9072, -77.0369],
  'México': [19.4326, -99.1332], Suriname: [5.852, -55.2038],
  'Bolívia': [-16.4897, -68.1193], Equador: [-0.1807, -78.4678], Venezuela: [10.4806, -66.9036],
};

const CIDADE: Record<string, [number, number]> = {
  'itaguaí/RJ': [-22.8636, -43.7798],
  'salvador/BA': [-12.9718, -38.5011],
  'bagé/RS': [-31.3297, -54.1069],
  'niterói/RJ': [-22.8832, -43.1034],
  'campinas/SP': [-22.9099, -47.0626],
  'recife/PE': [-8.0543, -34.8813],
};

function coordDe(r: RadarOpportunity): [number, number] | null {
  if (r.esfera === 'Municipal') {
    return CIDADE[`${r.cidade.toLowerCase()}/${r.uf}`] ?? UF_CAPITAL[r.uf] ?? null;
  }
  if (r.esfera === 'Estadual') return UF_CAPITAL[r.uf] ?? null;
  return PAIS_CAPITAL[r.pais] ?? null;
}

interface PinGroup {
  key: string;
  lat: number;
  lng: number;
  titulo: string;
  items: RadarOpportunity[];
  total: number;
  promovidas: number;
}

const brl0 = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

function FitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (points.length) {
      map.fitBounds(L.latLngBounds(points.map(([a, b]) => L.latLng(a, b))), { padding: [56, 56], maxZoom: 5 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.length]);
  return null;
}

export default function MapPage() {
  const [escopo, setEscopo] = useState<'todas' | 'brasil' | 'internacional'>('todas');
  const [sel, setSel] = useState<PinGroup | null>(null);

  const radar = useQuery({
    queryKey: ['radar', '', '', ''],
    queryFn: () => api.get<RadarOpportunity[]>('/radar'),
  });

  const groups = useMemo(() => {
    const items = (radar.data ?? []).filter((r) =>
      escopo === 'todas' ? true : escopo === 'brasil' ? r.pais === 'Brasil' : r.pais !== 'Brasil',
    );
    const map = new Map<string, PinGroup>();
    for (const r of items) {
      const coord = coordDe(r);
      if (!coord) continue;
      const key = coord.join(',');
      const titulo =
        r.esfera === 'Municipal' ? `${r.cidade}/${r.uf}` : r.esfera === 'Estadual' ? `${r.uf} — capital` : r.pais;
      const g = map.get(key) ?? { key, lat: coord[0], lng: coord[1], titulo, items: [], total: 0, promovidas: 0 };
      g.items.push(r);
      g.total += radarParseBRL(r.valor_estimado_total_contrato);
      if (r.opportunity_id) g.promovidas += 1;
      map.set(key, g);
    }
    return [...map.values()];
  }, [radar.data, escopo]);

  const totalGeral = groups.reduce((a, g) => a + g.total, 0);
  const nOportunidades = groups.reduce((a, g) => a + g.items.length, 0);

  return (
    <Box>
      <GlobalStyles
        styles={{
          '.faith-pin': { background: 'transparent', border: 'none' },
          '.faith-pin-inner': {
            width: 38,
            height: 38,
            borderRadius: '50% 50% 50% 4px',
            transform: 'rotate(-45deg)',
            background: `linear-gradient(135deg, ${DS.primary}, #3b82f6)`,
            border: '2.5px solid #ffffff',
            boxShadow: '0 6px 16px rgba(16,24,40,.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform .15s ease',
          },
          '.faith-pin-inner:hover': { transform: 'rotate(-45deg) scale(1.12)' },
          '.faith-pin-inner span': {
            transform: 'rotate(45deg)',
            color: '#fff',
            fontWeight: 800,
            fontSize: 14,
            fontFamily: 'Inter, sans-serif',
          },
          '.faith-pin-inner.is-won': { background: 'linear-gradient(135deg, #0f9d58, #12b76a)' },
          '.leaflet-container': { fontFamily: 'Inter, sans-serif' },
        }}
      />

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
        <MapContainer
          center={[-15, -50]}
          zoom={4}
          minZoom={2}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom
          worldCopyJump
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />
          <FitBounds points={groups.map((g) => [g.lat, g.lng] as [number, number])} />
          {groups.map((g) => (
            <Marker
              key={g.key}
              position={[g.lat, g.lng]}
              icon={L.divIcon({
                className: 'faith-pin',
                html: `<div class="faith-pin-inner${g.promovidas === g.items.length ? ' is-won' : ''}" title="${g.titulo} · ${brl0(g.total)}"><span>${g.items.length}</span></div>`,
                iconSize: [38, 38],
                iconAnchor: [19, 34],
              })}
              eventHandlers={{ click: () => setSel(g) }}
            />
          ))}
        </MapContainer>

        {/* Legenda */}
        <Card sx={{ position: 'absolute', left: 12, bottom: 12, zIndex: 1000 }}>
          <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 } }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: `linear-gradient(135deg, ${DS.primary}, #3b82f6)` }} />
                <Typography variant="caption">Em prospecção</Typography>
              </Stack>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: 'linear-gradient(135deg, #0f9d58, #12b76a)' }} />
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
                <PublicIcon fontSize="small" sx={{ color: 'primary.main' }} />
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
                    <Box
                      key={r.id}
                      sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, p: 1.25 }}
                    >
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
