import { useState } from 'react';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Stack,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import GridViewIcon from '@mui/icons-material/GridView';
import HandshakeIcon from '@mui/icons-material/Handshake';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuIcon from '@mui/icons-material/Menu';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import PublicIcon from '@mui/icons-material/Public';
import SearchIcon from '@mui/icons-material/Search';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { FaithLogo, FaithMark } from './FaithLogo';
import { api } from '../lib/api';
import type { Notification } from '../lib/types';
import { DS } from '../theme';

const DRAWER_WIDTH = 240;
const DRAWER_MINI = 72;
const NAV_PREF_KEY = 'faith.nav.collapsed';

/** Aparência por tipo de notificação (ícone + tom + rótulo). */
const NOTIF_META: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  nova_oportunidade: { icon: <TravelExploreIcon sx={{ fontSize: 16 }} />, label: 'Nova oportunidade', color: '#14556B', bg: '#DDEFF4' },
  mudanca_etapa: { icon: <ViewKanbanOutlinedIcon sx={{ fontSize: 16 }} />, label: 'Mudança de etapa', color: '#2B4469', bg: '#EAF1F7' },
  documento_pendente: { icon: <FactCheckIcon sx={{ fontSize: 16 }} />, label: 'Documento pendente', color: '#B4762A', bg: '#F6EDDD' },
  documento_rejeitado: { icon: <FactCheckIcon sx={{ fontSize: 16 }} />, label: 'Documento rejeitado', color: '#B4243A', bg: '#F8E6EA' },
  aprovacao_necessaria: { icon: <FactCheckIcon sx={{ fontSize: 16 }} />, label: 'Aprovação necessária', color: '#B4762A', bg: '#F6EDDD' },
  contratacao_proxima: { icon: <HandshakeIcon sx={{ fontSize: 16 }} />, label: 'Contratação próxima', color: '#14556B', bg: '#DDEFF4' },
  prazo_vencido: { icon: <AccessTimeIcon sx={{ fontSize: 16 }} />, label: 'Prazo vencido', color: '#B4243A', bg: '#F8E6EA' },
  default: { icon: <NotificationsNoneIcon sx={{ fontSize: 16 }} />, label: 'Notificação', color: '#2B4469', bg: '#EAF1F7' },
};

function tempoRel(iso: string) {
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.floor(h / 24);
  if (d <= 7) return `há ${d} d`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  permission: string;
}

const NAV: Array<{ section: string; items: NavItem[] }> = [
  {
    section: 'Visão geral',
    items: [
      { to: '/', label: 'Dashboard', icon: <GridViewIcon fontSize="small" />, permission: 'opp.view' },
      { to: '/oportunidades', label: 'Oportunidades', icon: <TravelExploreIcon fontSize="small" />, permission: 'opp.view' },
      { to: '/mapa', label: 'Mapa Global', icon: <PublicIcon fontSize="small" />, permission: 'opp.view' },
      { to: '/pipeline', label: 'Pipeline', icon: <ViewKanbanOutlinedIcon fontSize="small" />, permission: 'opp.view' },
    ],
  },
  {
    section: 'Cadastros',
    items: [
      { to: '/orgaos', label: 'Órgãos e Clientes', icon: <AccountBalanceIcon fontSize="small" />, permission: 'opp.view' },
      { to: '/parceiros', label: 'Parceiros', icon: <HandshakeIcon fontSize="small" />, permission: 'opp.view' },
      { to: '/pontos-focais', label: 'Pontos Focais', icon: <SupportAgentIcon fontSize="small" />, permission: 'opp.view' },
    ],
  },
  {
    section: 'Governança',
    items: [
      { to: '/auditoria', label: 'Auditoria', icon: <FactCheckIcon fontSize="small" />, permission: 'opp.audit.view' },
      { to: '/configuracao', label: 'Configuração', icon: <SettingsOutlinedIcon fontSize="small" />, permission: 'opp.config' },
    ],
  },
];

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(NAV_PREF_KEY) === '1';
  } catch {
    return false;
  }
}

export default function Layout() {
  const { me, can, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notifAnchor, setNotifAnchor] = useState<HTMLElement | null>(null);
  const [userAnchor, setUserAnchor] = useState<HTMLElement | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  const drawerWidth = collapsed ? DRAWER_MINI : DRAWER_WIDTH;

  function toggleCollapsed() {
    setCollapsed((c) => {
      try {
        localStorage.setItem(NAV_PREF_KEY, c ? '0' : '1');
      } catch {
        /* preferências locais são best-effort */
      }
      return !c;
    });
  }

  const notifications = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<Notification[]>('/notifications?unread=true'),
    refetchInterval: 60_000,
  });
  const unread = notifications.data?.length ?? 0;

  function submitSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate(`/oportunidades?q=${encodeURIComponent(globalSearch.trim())}`);
  }

  const isSelected = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

  const navContent = (mini: boolean) => (
    <>
      <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', px: mini ? 0.75 : 1.25, pt: 1 }}>
        {NAV.map((group, gi) => {
          const visible = group.items.filter((i) => can(i.permission));
          if (!visible.length) return null;
          return (
            <List
              key={group.section}
              dense
              subheader={
                mini ? (
                  gi > 0 ? (
                    <Divider sx={{ my: 1, mx: 1 }} />
                  ) : undefined
                ) : (
                  <ListSubheader
                    disableSticky
                    sx={{ bgcolor: 'transparent', typography: 'overline', lineHeight: 2.4, px: 1.25 }}
                  >
                    {group.section}
                  </ListSubheader>
                )
              }
              sx={{ mb: 0.5 }}
            >
              {visible.map((item) => {
                const selected = isSelected(item.to);
                const button = (
                  <ListItemButton
                    key={item.to}
                    component={Link}
                    to={item.to}
                    selected={selected}
                    onClick={() => setMobileOpen(false)}
                    sx={{
                      mb: 0.25,
                      py: 0.9,
                      justifyContent: mini ? 'center' : 'flex-start',
                      px: mini ? 1 : 1.5,
                      color: selected ? DS.ardosia : 'text.primary',
                      '&.Mui-selected': {
                        bgcolor: DS.primarySoft,
                        '&:hover': { bgcolor: DS.primarySoft },
                        '& .MuiListItemIcon-root': { color: DS.ardosia },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: mini ? 0 : 34, color: 'text.secondary', justifyContent: 'center' }}>
                      {item.icon}
                    </ListItemIcon>
                    {!mini && (
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: selected ? 700 : 500 }}
                      />
                    )}
                  </ListItemButton>
                );
                return mini ? (
                  <Tooltip key={item.to} title={item.label} placement="right">
                    {button}
                  </Tooltip>
                ) : (
                  button
                );
              })}
            </List>
          );
        })}
      </Box>
      <Divider />
      {!mini && (
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            FAITH v2.5.0 · by XPTO · SSO Tetelestai
          </Typography>
        </Box>
      )}
    </>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar sx={{ gap: 1.5, minHeight: 60 }}>
          <Tooltip title={collapsed ? 'Expandir menu' : 'Recolher menu'}>
            <IconButton
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
              sx={{ display: { xs: 'none', sm: 'inline-flex' }, color: 'rgba(255,255,255,.85)' }}
            >
              {collapsed ? <MenuIcon /> : <MenuOpenIcon />}
            </IconButton>
          </Tooltip>
          <IconButton
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            sx={{ display: { xs: 'inline-flex', sm: 'none' }, color: 'rgba(255,255,255,.85)' }}
          >
            <MenuIcon />
          </IconButton>

          <Box component={Link} to="/" sx={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}>
            {collapsed ? <FaithMark size={34} /> : <FaithLogo size={38} variant="negativo" />}
          </Box>

          <Box component="form" onSubmit={submitSearch} sx={{ flexGrow: 1, maxWidth: 520, ml: 1.5 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Buscar oportunidades, órgãos, objetos…"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" sx={{ color: 'rgba(255,255,255,.6)' }} />
                    </InputAdornment>
                  ),
                  sx: {
                    bgcolor: '#0B121F',
                    borderRadius: 2,
                    color: '#fff',
                    '& fieldset': { borderColor: DS.ardosia },
                    '&:hover fieldset': { borderColor: DS.aco },
                    '& input::placeholder': { color: 'rgba(255,255,255,.55)', opacity: 1 },
                  },
                },
              }}
            />
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Tooltip title="Notificações">
            <IconButton onClick={(e) => setNotifAnchor(e.currentTarget)} aria-label="Notificações" sx={{ color: 'rgba(255,255,255,.85)' }}>
              <Badge badgeContent={unread} color="error">
                <NotificationsNoneIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ my: 1.5, borderColor: 'rgba(255,255,255,.16)' }} />

          <Box
            component="button"
            onClick={(e: React.MouseEvent<HTMLElement>) => setUserAnchor(e.currentTarget)}
            aria-label="Conta"
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.25,
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              borderRadius: 2,
              px: 1,
              py: 0.5,
              '&:hover': { bgcolor: 'rgba(255,255,255,.08)' },
            }}
          >
            <Avatar sx={{ width: 30, height: 30, bgcolor: DS.ciano, color: DS.navy, fontSize: 14, fontWeight: 800, borderRadius: '9px' }}>
              {me?.fullName?.[0] ?? '?'}
            </Avatar>
            <Box sx={{ textAlign: 'left', display: { xs: 'none', md: 'block' } }}>
              <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.15, color: '#fff' }}>
                {me?.displayName ?? me?.fullName}
              </Typography>
              <Typography variant="caption" sx={{ lineHeight: 1.1, color: DS.ciano, fontWeight: 600 }}>
                {me?.profile}
              </Typography>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      <Menu
        anchorEl={notifAnchor}
        open={!!notifAnchor}
        onClose={() => setNotifAnchor(null)}
        slotProps={{ paper: { sx: { width: 400, maxWidth: 'calc(100vw - 24px)' } } }}
      >
        <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center' }}>
          <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
            Notificações {unread > 0 && `(${unread})`}
          </Typography>
          {unread > 0 && (
            <Typography
              variant="caption"
              role="button"
              tabIndex={0}
              onClick={async () => {
                setNotifAnchor(null);
                await api.patch('/notifications/read-all');
                await queryClient.invalidateQueries({ queryKey: ['notifications'] });
              }}
              sx={{ color: DS.ardosia, fontWeight: 700, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
            >
              Marcar todas como lidas
            </Typography>
          )}
        </Box>
        <Divider />
        {unread === 0 && (
          <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
            <NotificationsNoneIcon sx={{ color: 'text.disabled' }} />
            <Typography variant="body2" color="text.secondary">
              Tudo em dia — nenhuma notificação não lida.
            </Typography>
          </Box>
        )}
        <Box sx={{ maxHeight: 420, overflowY: 'auto' }}>
          {(notifications.data ?? []).slice(0, 20).map((n) => {
            const meta = NOTIF_META[n.type] ?? NOTIF_META.default;
            return (
              <MenuItem
                key={n.id}
                component={Link}
                to={n.opportunityId ? `/oportunidades/${n.opportunityId}` : '/'}
                onClick={async () => {
                  setNotifAnchor(null);
                  await api.patch(`/notifications/${n.id}/read`);
                  await queryClient.invalidateQueries({ queryKey: ['notifications'] });
                }}
                sx={{ whiteSpace: 'normal', alignItems: 'flex-start', gap: 1.25, py: 1 }}
              >
                <Box
                  sx={{
                    width: 30, height: 30, borderRadius: '50%', flexShrink: 0, mt: 0.25,
                    display: 'grid', placeItems: 'center', bgcolor: meta.bg, color: meta.color,
                  }}
                >
                  {meta.icon}
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600}>
                    {n.title}
                  </Typography>
                  {n.body && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {n.body}
                    </Typography>
                  )}
                  <Typography variant="caption" sx={{ color: DS.aco }}>
                    {tempoRel(n.createdAt)} · {meta.label}
                  </Typography>
                </Box>
              </MenuItem>
            );
          })}
        </Box>
      </Menu>

      <Menu anchorEl={userAnchor} open={!!userAnchor} onClose={() => setUserAnchor(null)}>
        <MenuItem disabled>
          <ListItemText primary={me?.fullName} secondary={`${me?.email} · ${me?.profile}`} />
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => void signOut()}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          Sair
        </MenuItem>
      </Menu>

      {/* Sidebar desktop (recolhível, animada) */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          display: { xs: 'none', sm: 'block' },
          [`& .MuiDrawer-paper`]: {
            width: drawerWidth,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            overflowX: 'hidden',
            transition: 'width .22s ease',
          },
          transition: 'width .22s ease',
        }}
      >
        <Toolbar sx={{ minHeight: 60 }} />
        {navContent(collapsed)}
      </Drawer>

      {/* Sidebar mobile (temporária) */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, display: 'flex', flexDirection: 'column' },
        }}
      >
        <Toolbar sx={{ minHeight: 60 }}>
          <FaithLogo size={34} variant="positivo" />
        </Toolbar>
        {navContent(false)}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: { xs: 2, md: 3 } }}>
        <Toolbar sx={{ minHeight: 60 }} />
        <Box sx={{ maxWidth: 1440, mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
