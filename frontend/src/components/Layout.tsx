import { useState } from 'react';
import {
  AppBar,
  Avatar,
  Badge,
  Box,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';
import BusinessIcon from '@mui/icons-material/Business';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import HandshakeIcon from '@mui/icons-material/Handshake';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { api } from '../lib/api';
import type { Notification } from '../lib/types';

const DRAWER_WIDTH = 232;

const NAV = [
  { to: '/', label: 'Pipeline', icon: <ViewKanbanIcon />, permission: 'opp.view' },
  { to: '/dashboard', label: 'Dashboard', icon: <AssessmentIcon />, permission: 'opp.dashboard.view' },
  { to: '/clientes', label: 'Clientes', icon: <BusinessIcon />, permission: 'opp.view' },
  { to: '/parceiros', label: 'Parceiros', icon: <HandshakeIcon />, permission: 'opp.view' },
  { to: '/auditoria', label: 'Auditoria', icon: <FactCheckIcon />, permission: 'opp.audit.view' },
  { to: '/configuracao', label: 'Configuração', icon: <SettingsIcon />, permission: 'opp.config' },
];

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

  const unread = notifications.data?.length ?? 0;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Portal de Oportunidades <Typography component="span" sx={{ opacity: 0.7 }}>XPTO + SERPRO</Typography>
          </Typography>
          <IconButton color="inherit" onClick={(e) => setNotifAnchor(e.currentTarget)} aria-label="Notificações">
            <Badge badgeContent={unread} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <IconButton onClick={(e) => setUserAnchor(e.currentTarget)} sx={{ ml: 1 }} aria-label="Conta">
            <Avatar sx={{ width: 32, height: 32 }}>{me?.fullName?.[0] ?? '?'}</Avatar>
          </IconButton>
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
            sx={{ whiteSpace: 'normal', maxWidth: 360 }}
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
        <MenuItem onClick={() => void signOut()}>Sair</MenuItem>
      </Menu>

      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <List>
          {NAV.filter((item) => can(item.permission)).map((item) => (
            <ListItemButton
              key={item.to}
              component={Link}
              to={item.to}
              selected={location.pathname === item.to}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, bgcolor: 'background.default' }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
