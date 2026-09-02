import { useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Grid2 as Grid,
  MenuItem,
  Slider,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '../lib/api';
import type { Client, Opportunity, Page, Partner } from '../lib/types';

interface UserOption {
  id: number;
  fullName: string;
  email: string;
}

export default function NewOpportunityPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [leadSource, setLeadSource] = useState<'xpto' | 'parceiro' | 'serpro'>('xpto');
  const [client, setClient] = useState<Client | null>(null);
  const [partner, setPartner] = useState<Partner | null>(null);
  const [objeto, setObjeto] = useState('');
  const [solucao, setSolucao] = useState('');
  const [valorEstimado, setValorEstimado] = useState('');
  const [receitaPrevista, setReceitaPrevista] = useState('');
  const [probabilidade, setProbabilidade] = useState(50);
  const [complexidade, setComplexidade] = useState<'baixa' | 'media' | 'alta' | ''>('');
  const [expectedCloseDate, setExpectedCloseDate] = useState('');
  const [prazoEstimado, setPrazoEstimado] = useState('');
  const [gestorXpto, setGestorXpto] = useState<UserOption | null>(null);
  const [gestorSerpro, setGestorSerpro] = useState<UserOption | null>(null);
  const [observacoes, setObservacoes] = useState('');
  const [userSearch, setUserSearch] = useState('');

  const clients = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.get<Page<Client>>('/clients?pageSize=100'),
  });
  const partners = useQuery({
    queryKey: ['partners'],
    queryFn: () => api.get<Page<Partner>>('/partners?pageSize=100'),
  });
  const users = useQuery({
    queryKey: ['users', userSearch],
    queryFn: () => api.get<UserOption[]>(`/users?search=${encodeURIComponent(userSearch)}`),
  });

  async function submit() {
    setError(null);
    if (!client || !objeto.trim() || !solucao.trim() || !gestorXpto) {
      setError('Preencha origem, cliente, objeto, solução e gestor XPTO (RN-004).');
      return;
    }
    if (leadSource === 'parceiro' && !partner) {
      setError('Origem "parceiro" exige parceiro vinculado (RN-005).');
      return;
    }
    setSaving(true);
    try {
      const created = await api.post<Opportunity>('/opportunities', {
        leadSource,
        clientId: client.id,
        partnerId: partner?.id,
        objeto,
        solucao,
        valorEstimado: valorEstimado === '' ? undefined : Number(valorEstimado),
        receitaPrevista: receitaPrevista === '' ? undefined : Number(receitaPrevista),
        probabilidade,
        complexidade: complexidade === '' ? undefined : complexidade,
        expectedCloseDate: expectedCloseDate || undefined,
        prazoEstimado: prazoEstimado || undefined,
        gestorXptoId: gestorXpto.id,
        gestorSerproId: gestorSerpro?.id,
        observacoes: observacoes || undefined,
      });
      navigate(`/oportunidades/${created.id}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Falha ao criar a oportunidade.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ maxWidth: 960 }}>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Nova oportunidade
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Card variant="outlined">
        <CardContent>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                select
                fullWidth
                label="Origem do lead"
                value={leadSource}
                onChange={(e) => setLeadSource(e.target.value as typeof leadSource)}
              >
                <MenuItem value="xpto">Captado pela XPTO</MenuItem>
                <MenuItem value="parceiro">Empresa parceira</MenuItem>
                <MenuItem value="serpro">Orgânico SERPRO</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Autocomplete
                options={clients.data?.items ?? []}
                getOptionLabel={(c) => `${c.name}${c.orgao ? ` (${c.orgao})` : ''}`}
                value={client}
                onChange={(_e, v) => setClient(v)}
                renderInput={(params) => <TextField {...params} label="Cliente / Órgão" required />}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Autocomplete
                options={partners.data?.items ?? []}
                getOptionLabel={(p) => p.name}
                value={partner}
                onChange={(_e, v) => setPartner(v)}
                renderInput={(params) => (
                  <TextField {...params} label="Parceiro" required={leadSource === 'parceiro'} />
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth required label="Objeto da contratação" value={objeto} onChange={(e) => setObjeto(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth required label="Solução ofertada" value={solucao} onChange={(e) => setSolucao(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField fullWidth type="number" label="Valor estimado (R$)" value={valorEstimado} onChange={(e) => setValorEstimado(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField fullWidth type="number" label="Receita prevista (R$)" value={receitaPrevista} onChange={(e) => setReceitaPrevista(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField select fullWidth label="Complexidade" value={complexidade} onChange={(e) => setComplexidade(e.target.value as typeof complexidade)}>
                <MenuItem value="">—</MenuItem>
                <MenuItem value="baixa">Baixa</MenuItem>
                <MenuItem value="media">Média</MenuItem>
                <MenuItem value="alta">Alta</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <TextField
                fullWidth
                type="date"
                label="Fechamento previsto"
                value={expectedCloseDate}
                onChange={(e) => setExpectedCloseDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Typography gutterBottom variant="body2">
                Probabilidade de fechamento: {probabilidade}%
              </Typography>
              <Slider value={probabilidade} onChange={(_e, v) => setProbabilidade(v as number)} min={0} max={100} step={5} valueLabelDisplay="auto" />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="Prazo estimado de execução" value={prazoEstimado} onChange={(e) => setPrazoEstimado(e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Autocomplete
                options={users.data ?? []}
                getOptionLabel={(u) => `${u.fullName} (${u.email})`}
                value={gestorXpto}
                onChange={(_e, v) => setGestorXpto(v)}
                onInputChange={(_e, v) => setUserSearch(v)}
                renderInput={(params) => <TextField {...params} label="Gestor XPTO" required />}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Autocomplete
                options={users.data ?? []}
                getOptionLabel={(u) => `${u.fullName} (${u.email})`}
                value={gestorSerpro}
                onChange={(_e, v) => setGestorSerpro(v)}
                onInputChange={(_e, v) => setUserSearch(v)}
                renderInput={(params) => <TextField {...params} label="Gestor SERPRO" />}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth multiline minRows={2} label="Observações" value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
            </Grid>
          </Grid>
          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
            <Button onClick={() => navigate(-1)}>Cancelar</Button>
            <Button variant="contained" disabled={saving} onClick={() => void submit()}>
              Criar oportunidade
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
