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
                      color: selected ? 'primary.main' : 'text.primary',
                      '&.Mui-selected': {
                        bgcolor: DS.primarySoft,
                        '&:hover': { bgcolor: DS.primarySoft },
                        '& .MuiListItemIcon-root': { color: 'primary.main' },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: mini ? 0 : 34, color: 'text.secondary', justifyContent: 'center' }}>
                      {item.icon}
                    </ListItemIcon>
                    {!mini && (
                      <ListItemText
                        primary={item.label}
                        primaryTypographyProps={{ fontSize: '0.875rem', fontWeight: selected ? 600 : 500 }}
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
            FAITH v1.3.0 · SSO Tetelestai
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
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            >
              {collapsed ? <MenuIcon /> : <MenuOpenIcon />}
            </IconButton>
          </Tooltip>
          <IconButton
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
            sx={{ display: { xs: 'inline-flex', sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box component={Link} to="/" sx={{ textDecoration: 'none', color: 'inherit', display: 'flex', alignItems: 'center' }}>
            {collapsed ? <FaithMark size={32} /> : <FaithLogo size={32} subtitle="Portal de Oportunidades" />}
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
          <FaithLogo size={30} subtitle={null} />
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
