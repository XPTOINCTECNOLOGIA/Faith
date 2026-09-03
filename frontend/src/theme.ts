import { createTheme } from '@mui/material';
import { ptBR } from '@mui/material/locale';

/**
 * FAITH Design System v1 — "Executivo claro"
 *
 * Referências: Microsoft Fabric, Stripe Dashboard, Linear, Salesforce Lightning.
 * Princípios: superfície branca sobre canvas neutro, bordas sutis no lugar de
 * sombras, 1 cor primária com significado (ação/seleção), cores de status
 * semânticas, tipografia Inter com escala fixa e espaço generoso.
 *
 * Tokens
 *  canvas        #f6f7f9   fundo da aplicação
 *  surface       #ffffff   cartões, tabelas, sidebar, header
 *  border        #e4e7ec   divisões (1px, sempre sutil)
 *  text.primary  #101828   títulos e dados
 *  text.secondary#667085   apoio, labels, captions
 *  primary       #1a56db   azul corporativo (ação, seleção, links)
 *  success/warning/error/info — apenas para estado, nunca decoração
 */

export const DS = {
  canvas: '#f6f7f9',
  surface: '#ffffff',
  surfaceMuted: '#f9fafb',
  border: '#e4e7ec',
  borderStrong: '#d0d5dd',
  textPrimary: '#101828',
  textSecondary: '#667085',
  primary: '#1a56db',
  primaryDark: '#1642a8',
  primarySoft: '#eef4ff',
  success: '#12833f',
  successSoft: '#e8f6ee',
  warning: '#b54708',
  warningSoft: '#fef4e6',
  error: '#b42318',
  errorSoft: '#fdecea',
  info: '#175cd3',
  infoSoft: '#eaf2fe',
  shadowXs: '0 1px 2px rgba(16, 24, 40, 0.05)',
  shadowMd: '0 8px 24px rgba(16, 24, 40, 0.10)',
} as const;

export const theme = createTheme(
  {
    palette: {
      mode: 'light',
      primary: { main: DS.primary, dark: DS.primaryDark, contrastText: '#ffffff' },
      secondary: { main: DS.textSecondary },
      background: { default: DS.canvas, paper: DS.surface },
      text: { primary: DS.textPrimary, secondary: DS.textSecondary },
      divider: DS.border,
      success: { main: DS.success },
      warning: { main: DS.warning },
      error: { main: DS.error },
      info: { main: DS.info },
    },
    shape: { borderRadius: 10 },
    typography: {
      fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", sans-serif',
      // Escala: Page title / Section / Card title / Label / Body / Caption
      h4: { fontWeight: 700, fontSize: '1.5rem', letterSpacing: '-0.02em' },   // Page title
      h5: { fontWeight: 700, fontSize: '1.25rem', letterSpacing: '-0.01em' },
      h6: { fontWeight: 600, fontSize: '1rem' },                               // Section title
      subtitle1: { fontWeight: 600, fontSize: '0.9375rem' },
      subtitle2: { fontWeight: 600, fontSize: '0.8125rem' },                   // Card title
      body1: { fontSize: '0.9375rem' },
      body2: { fontSize: '0.875rem' },
      caption: { fontSize: '0.75rem' },
      overline: {
        fontSize: '0.6875rem',
        fontWeight: 600,
        letterSpacing: '0.06em',
        color: DS.textSecondary,
      },
      button: { textTransform: 'none', fontWeight: 600 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundColor: DS.canvas },
          '*:focus-visible': {
            outline: `2px solid ${DS.primary}`,
            outlineOffset: 2,
          },
        },
      },
      MuiAppBar: {
        defaultProps: { color: 'inherit', elevation: 0 },
        styleOverrides: {
          root: {
            backgroundColor: DS.surface,
            color: DS.textPrimary,
            borderBottom: `1px solid ${DS.border}`,
          },
        },
      },
      MuiDrawer: {
        styleOverrides: {
          paper: { backgroundColor: DS.surface, borderRight: `1px solid ${DS.border}` },
        },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: {
          root: {
            border: `1px solid ${DS.border}`,
            boxShadow: DS.shadowXs,
            backgroundImage: 'none',
          },
        },
      },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 8, paddingLeft: 14, paddingRight: 14 },
          outlined: { borderColor: DS.borderStrong },
        },
      },
      MuiTextField: { defaultProps: { size: 'small' } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: DS.surface,
            '& fieldset': { borderColor: DS.borderStrong },
          },
        },
      },
      MuiTableHead: {
        styleOverrides: {
          root: {
            '& .MuiTableCell-head': {
              backgroundColor: DS.surfaceMuted,
              color: DS.textSecondary,
              fontSize: '0.72rem',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: { root: { borderColor: '#eef0f3', paddingTop: 10, paddingBottom: 10 } },
      },
      MuiTableRow: {
        styleOverrides: {
          root: { '&.MuiTableRow-hover:hover': { backgroundColor: DS.primarySoft } },
        },
      },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: 14, boxShadow: DS.shadowMd } },
      },
      MuiMenu: {
        styleOverrides: {
          paper: { border: `1px solid ${DS.border}`, boxShadow: DS.shadowMd, borderRadius: 10 },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { fontWeight: 600, borderRadius: 6 },
          outlined: { borderColor: DS.borderStrong },
        },
      },
      MuiTabs: {
        styleOverrides: {
          root: { minHeight: 40, borderBottom: `1px solid ${DS.border}` },
          indicator: { height: 2 },
        },
      },
      MuiTab: {
        styleOverrides: { root: { minHeight: 40, textTransform: 'none', fontWeight: 600 } },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: { backgroundColor: DS.textPrimary, fontSize: '0.75rem', borderRadius: 6 },
        },
      },
      MuiAlert: { styleOverrides: { root: { borderRadius: 10 } } },
      MuiLinearProgress: {
        styleOverrides: { root: { borderRadius: 99, backgroundColor: '#e9edf3' } },
      },
      MuiListItemButton: { styleOverrides: { root: { borderRadius: 8 } } },
    },
  },
  ptBR,
);

/** Cores fixas por origem do lead (paleta de dados validada — claro). */
export const SOURCE_HEX: Record<string, string> = {
  xpto: '#2a78d6',
  parceiro: '#eb6834',
  serpro: '#1baf7a',
};

/** Cores de status semânticas em par texto/fundo (badges). */
export const STATE_SOFT = {
  success: { color: DS.success, bg: DS.successSoft },
  warning: { color: DS.warning, bg: DS.warningSoft },
  error: { color: DS.error, bg: DS.errorSoft },
  info: { color: DS.info, bg: DS.infoSoft },
  neutral: { color: DS.textSecondary, bg: '#f2f4f7' },
} as const;
