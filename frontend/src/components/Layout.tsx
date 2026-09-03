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
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import SearchIcon from '@mui/icons-material/Search';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import ViewKanbanOutlinedIcon from '@mui/icons-material/ViewKanbanOutlined';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { FaithLogo } from './FaithLogo';
import { api } from '../lib/api';
import type { Notification } from '../lib/types';
import { DS } from '../theme';

const DRAWER_WIDTH = 240;

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

export default function Layout() {
  const { me, can, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notifAnchor, setNotifAnchor] = useState<HTMLElement | null>(null);
  const [userAnchor, setUserAnchor] = useState<HTMLElement | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');

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

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar sx={{ gap: 2, minHeight: 60 }}>
          <Box component={Link} to="/" sx={{ textDecoration: 'none', color: 'inherit', width: DRAWER_WIDTH - 24 }}>
            <FaithLogo size={32} subtitle="Portal de Oportunidades" />
          </Box>

          <Box component="form" onSubmit={submitSearch} sx={{ flexGrow: 1, maxWidth: 520 }}>
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
                      <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  sx: { bgcolor: DS.surfaceMuted, borderRadius: 2 },
                },
              }}
            />
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Tooltip title="Notificações">
            <IconButton onClick={(e) => setNotifAnchor(e.currentTarget)} aria-label="Notificações">
              <Badge badgeContent={unread} color="error">
                <NotificationsNoneIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ my: 1.5 }} />

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
              '&:hover': { bgcolor: DS.surfaceMuted },
            }}
          >
            <Avatar sx={{ width: 30, height: 30, bgcolor: DS.primary, fontSize: 14, fontWeight: 700 }}>
              {me?.fullName?.[0] ?? '?'}
            </Avatar>
            <Box sx={{ textAlign: 'left', display: { xs: 'none', md: 'block' } }}>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.15 }}>
                {me?.displayName ?? me?.fullName}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.1 }}>
                {me?.profile}
              </Typography>
            </Box>
          </Box>
        </Toolbar>
      </AppBar>

      <Menu anchorEl={notifAnchor} open={!!notifAnchor} onClose={() => setNotifAnchor(null)}>
        {unread === 0 && <MenuItem disabled>Sem notificações não lidas</MenuItem>}
        {(notifications.data ?? []).slice(0, 8).map((n) => (
          <MenuItem
            key={n.id}
            component={Link}
            to={n.opportunityId ? `/oportunidades/${n.opportunityId}` : '/'}
            onClick={async () => {
              setNotifAnchor(null);
              await api.patch(`/notifications/${n.id}/read`);
              await queryClient.invalidateQueries({ queryKey: ['notifications'] });
            }}
            sx={{ whiteSpace: 'normal', maxWidth: 380 }}
          >
            <ListItemText primary={n.title} secondary={n.body || undefined} />
          </MenuItem>
        ))}
        {unread > 0 && (
          <MenuItem
            onClick={async () => {
              setNotifAnchor(null);
              await api.patch('/notifications/read-all');
              await queryClient.invalidateQueries({ queryKey: ['notifications'] });
            }}
          >
            <Typography color="primary">Marcar todas como lidas</Typography>
          </MenuItem>
        )}
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

      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          display: { xs: 'none', sm: 'block' },
          [`& .MuiDrawer-paper`]: {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Toolbar sx={{ minHeight: 60 }} />
        <Box sx={{ flexGrow: 1, overflowY: 'auto', px: 1.25, pt: 1 }}>
          {NAV.map((group) => {
            const visible = group.items.filter((i) => can(i.permission));
            if (!visible.length) return null;
            return (
              <List
                key={group.section}
                dense
                subheader={
                  <ListSubheader
                    disableSticky
                    sx={{
                      bgcolor: 'transparent',
                      typography: 'overline',
                      lineHeight: 2.4,
                      px: 1.25,
                    }}
                  >
                    {group.section}
                  </ListSubheader>
                }
                sx={{ mb: 0.5 }}
              >
                {visible.map((item) => {
                  const selected = isSelected(item.to);
                  return (
                    <ListItemButton
                      key={item.to}
                      component={Link}
                      to={item.to}
                      selected={selected}
                      sx={{
                        mb: 0.25,
                        py: 0.75,
                        color: selected ? 'primary.main' : 'text.primary',
                        '&.Mui-selected': {
                          bgcolor: DS.primarySoft,
                          '&:hover': { bgcolor: DS.primarySoft },
                          '& .MuiListItemIcon-root': { color: 'primary.main' },
                        },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 34, color: 'text.secondary' }}>{item.icon}</ListItemIcon>
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: selected ? 600 : 500 }}
                      />
                    </ListItemButton>
                  );
                })}
              </List>
            );
          })}
        </Box>
        <Divider />
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            FAITH v1.0.1 · SSO Tetelestai
          </Typography>
        </Box>
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
