import { useState } from 'react';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Toolbar,
  Typography,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BusinessIcon from '@mui/icons-material/Business';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import HandshakeIcon from '@mui/icons-material/Handshake';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { FaithLogo } from './FaithLogo';
import { api } from '../lib/api';
import type { Notification, Opportunity, Page } from '../lib/types';

const DRAWER_WIDTH = 248;

export default function Layout() {
  const { me, can, signOut } = useAuth();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [notifAnchor, setNotifAnchor] = useState<HTMLElement | null>(null);
  const [userAnchor, setUserAnchor] = useState<HTMLElement | null>(null);

  const notifications = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.get<Notification[]>('/notifications?unread=true'),
    refetchInterval: 60_000,
  });

  const openCount = useQuery({
    queryKey: ['open-count'],
    queryFn: () => api.get<Page<Opportunity>>('/opportunities?status=aberta&pageSize=1'),
    refetchInterval: 60_000,
    enabled: can('opp.view'),
  });

  const unread = notifications.data?.length ?? 0;

  const NAV = [
    {
      to: '/',
      label: 'Pipeline',
      icon: <ViewKanbanIcon />,
      permission: 'opp.view',
      badge: openCount.data?.total,
    },
    { to: '/dashboard', label: 'Dashboard', icon: <AssessmentIcon />, permission: 'opp.dashboard.view' },
    { to: '/clientes', label: 'Clientes', icon: <BusinessIcon />, permission: 'opp.view' },
    { to: '/parceiros', label: 'Parceiros', icon: <HandshakeIcon />, permission: 'opp.view' },
    { to: '/auditoria', label: 'Auditoria', icon: <FactCheckIcon />, permission: 'opp.audit.view' },
    { to: '/configuracao', label: 'Configuração', icon: <SettingsIcon />, permission: 'opp.config' },
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" elevation={0} sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar sx={{ gap: 2 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" component={Link} to="/" sx={{ textDecoration: 'none', color: 'inherit' }}>
            <FaithLogo size={34} subtitle={null} />
            <Typography variant="body2" sx={{ color: 'text.secondary', display: { xs: 'none', sm: 'block' } }}>
              Portal de Oportunidades{' '}
              <Typography component="span" variant="body2" sx={{ color: 'primary.main', fontWeight: 700 }}>
                XPTO + SERPRO
              </Typography>
            </Typography>
          </Stack>

          <Box sx={{ flexGrow: 1 }} />

          <Chip
            size="small"
            variant="outlined"
            sx={{ borderColor: 'divider', color: 'text.secondary' }}
            label={
              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    bgcolor: 'success.main',
                    '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.35 } },
                    animation: 'pulse 2s infinite',
                  }}
                />
                <span>ONLINE · SSO CORPORATIVO</span>
              </Stack>
            }
          />

          <IconButton color="inherit" onClick={(e) => setNotifAnchor(e.currentTarget)} aria-label="Notificações">
            <Badge badgeContent={unread} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>

          <Button
            onClick={(e) => setUserAnchor(e.currentTarget)}
            color="inherit"
            aria-label="Conta"
            sx={{ textTransform: 'none', px: 1.25, borderRadius: 2 }}
          >
            <Stack direction="row" spacing={1.25} alignItems="center">
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', color: 'primary.contrastText', fontWeight: 800 }}>
                {me?.fullName?.[0] ?? '?'}
              </Avatar>
              <Stack alignItems="flex-start" sx={{ display: { xs: 'none', md: 'flex' } }}>
                <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.1 }}>
                  {me?.displayName ?? me?.fullName}
                </Typography>
                <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700, lineHeight: 1.1 }}>
                  {me?.profile?.toUpperCase()}
                </Typography>
              </Stack>
            </Stack>
          </Button>
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
          [`& .MuiDrawer-paper`]: {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Toolbar />
        <List sx={{ px: 1, pt: 1.5 }}>
          {NAV.filter((item) => can(item.permission)).map((item) => (
            <ListItemButton
              key={item.to}
              component={Link}
              to={item.to}
              selected={location.pathname === item.to}
              sx={{
                borderRadius: 2,
                mb: 0.5,
                '&.Mui-selected': {
                  bgcolor: 'rgba(96, 207, 226, 0.12)',
                  color: 'primary.main',
                  '& .MuiListItemIcon-root': { color: 'primary.main' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} primaryTypographyProps={{ fontWeight: 600 }} />
              {item.badge != null && item.badge > 0 && (
                <Chip size="small" label={item.badge} sx={{ bgcolor: 'rgba(96,207,226,0.16)', color: 'primary.main' }} />
              )}
            </ListItemButton>
          ))}
        </List>

        <Box sx={{ flexGrow: 1 }} />
        <Divider />
        <Stack spacing={0.5} sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary">
            FAITH · Portal de Oportunidades v0.1.1
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Sessão única com o Tetelestai (SSO)
          </Typography>
          <Button
            size="small"
            startIcon={<LogoutIcon />}
            onClick={() => void signOut()}
            sx={{ alignSelf: 'flex-start', mt: 0.5, color: 'text.secondary' }}
          >
            Encerrar sessão
          </Button>
        </Stack>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, bgcolor: 'background.default', minWidth: 0 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
