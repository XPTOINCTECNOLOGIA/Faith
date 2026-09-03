import { useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from '../lib/api';
import type { Stage } from '../lib/types';

interface Template {
  id: number;
  name: string;
  docCategory: string | null;
  required: boolean;
  position: number;
  active: boolean;
}

/** Configuração de etapas e checklists (UC-11). Perfil administrador (opp.config). */
export default function AdminPage() {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Stage | null>(null);
  const [newItem, setNewItem] = useState('');
  const [newRequired, setNewRequired] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stages = useQuery({
    queryKey: ['stages', 'all'],
    queryFn: () => api.get<Stage[]>('/stages?all=true'),
  });
  const templates = useQuery({
    queryKey: ['templates', selected?.id],
    queryFn: () => api.get<Template[]>(`/stages/${selected!.id}/checklist-templates`),
    enabled: !!selected,
  });

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: ['templates', selected?.id] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Operação falhou.');
    }
  }

  if (stages.isLoading) return <LinearProgress />;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 0.5 }}>
        Configuração da esteira
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Alterações em templates não afetam checklists já instanciados (RN-010). Perfis e permissões
        continuam administrados na Governança do Tetelestai.
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
        <Box sx={{ minWidth: 320 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            Etapas
          </Typography>
          <List dense>
            {(stages.data ?? []).map((stage) => (
              <ListItem
                key={stage.id}
                onClick={() => setSelected(stage)}
                sx={{
                  cursor: 'pointer',
                  borderLeft: 3,
                  borderColor: stage.color ?? 'divider',
                  bgcolor: selected?.id === stage.id ? 'action.selected' : undefined,
                  mb: 0.5,
                }}
              >
                <ListItemText primary={`${stage.position}. ${stage.name}`} secondary={stage.code} />
                {stage.isTerminal && <Chip size="small" label="terminal" />}
                {!stage.active && <Chip size="small" label="inativa" color="warning" />}
              </ListItem>
            ))}
          </List>
        </Box>

        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
            {selected ? `Checklist da etapa: ${selected.name}` : 'Selecione uma etapa'}
          </Typography>
          {selected && (
            <>
              <List dense>
                {(templates.data ?? []).map((template) => (
                  <ListItem key={template.id} divider>
                    <ListItemText
                      primary={template.name}
                      secondary={`${template.docCategory ?? 'sem categoria'} · ${template.required ? 'obrigatório' : 'opcional'}${template.active ? '' : ' · inativo'}`}
                    />
                    <Button
                      size="small"
                      onClick={() =>
                        run(() => api.patch(`/checklist-templates/${template.id}`, { active: !template.active }))
                      }
                    >
                      {template.active ? 'Desativar' : 'Reativar'}
                    </Button>
                    <Button
                      size="small"
                      onClick={() =>
                        run(() => api.patch(`/checklist-templates/${template.id}`, { required: !template.required }))
                      }
                    >
                      {template.required ? 'Tornar opcional' : 'Tornar obrigatório'}
                    </Button>
                  </ListItem>
                ))}
              </List>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2 }}>
                <TextField
                  size="small"
                  fullWidth
                  label="Novo item de checklist"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                />
                <FormControlLabel
                  control={<Checkbox checked={newRequired} onChange={(e) => setNewRequired(e.target.checked)} />}
                  label="Obrigatório"
                />
                <Button
                  variant="contained"
                  disabled={!newItem.trim()}
                  onClick={() =>
                    run(async () => {
                      await api.post(`/stages/${selected.id}/checklist-templates`, {
                        name: newItem,
                        required: newRequired,
                      });
                      setNewItem('');
                    })
                  }
                >
                  Adicionar
                </Button>
              </Stack>
            </>
          )}
        </Box>
      </Stack>
    </Box>
  );
}
