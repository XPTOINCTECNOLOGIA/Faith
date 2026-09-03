import { createTheme } from '@mui/material';
import { ptBR } from '@mui/material/locale';

/**
 * FAITH Design System v2 — Brand Book XPTO Inc. v3.0 (kit oficial da marca)
 *
 * Submarca endossada "FAITH by XPTO": herda a paleta master da XPTO.
 * Ciano = ação · Aço = apoio · Ardósia = dados e camadas · Navy = appbar.
 * Nenhuma cor fora da paleta master; derivados são tons/opacidade dela.
 * Tipografia Manrope (título 800, rótulo 600, corpo 400, legenda 300).
 * Estados: sucesso/informação são carregados por ciano e ardósia; alerta
 * (#B4762A) e erro (#B4243A) entram apenas em feedback de sistema.
 */

export const DS = {
  // Paleta master XPTO
  navy: '#101828',
  ciano: '#60CFE2',
  cianoHover: '#4FC2D6',
  aco: '#638CAD',
  ardosia: '#2B4469',
  offwhite: '#F4F6FA',
  grafite: '#14142B',
  // Derivados de interface (kit faith-brand.css)
  canvas: '#F4F6FA',
  surface: '#FFFFFF',
  surfaceMuted: '#EAF1F7',
  border: '#E3E8F0',
  borderStrong: '#638CAD',
  textPrimary: '#14142B',
  textSecondary: '#5B6B84',
  primary: '#60CFE2',
  primaryDark: '#4FC2D6',
  primarySoft: '#DDEFF4',
  navySoft: '#EAF1F7',
  success: '#14556B',
  successSoft: '#DDEFF4',
  warning: '#B4762A',
  warningSoft: '#F6EDDD',
  error: '#B4243A',
  errorSoft: '#F8E6EA',
  info: '#2B4469',
  infoSoft: '#EAF1F7',
  shadowXs: '0 1px 2px rgba(16, 24, 40, 0.06)',
  shadowMd: '0 8px 24px rgba(16, 24, 40, 0.12)',
} as const;

export const theme = createTheme(
  {
    palette: {
      mode: 'light',
      primary: { main: DS.primary, dark: DS.primaryDark, contrastText: DS.navy },
      secondary: { main: DS.ardosia },
      background: { default: DS.canvas, paper: DS.surface },
      text: { primary: DS.textPrimary, secondary: DS.textSecondary },
      divider: DS.border,
      success: { main: DS.success },
      warning: { main: DS.warning },
      error: { main: DS.error },
      info: { main: DS.info },
    },
    shape: { borderRadius: 9 },
    typography: {
      fontFamily: '"Manrope", system-ui, -apple-system, "Segoe UI", sans-serif',
      // Escala do kit: h1 32 / h2 24 / h3 18 / corpo 15 / rótulo 13 / legenda 12
      h4: { fontWeight: 800, fontSize: '1.5rem', letterSpacing: '-0.01em' },   // Page title
      h5: { fontWeight: 800, fontSize: '1.25rem' },
      h6: { fontWeight: 800, fontSize: '1.125rem' },                           // Section title
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
            backgroundColor: DS.navy,
            color: '#ffffff',
            borderBottom: 'none',
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
            borderRadius: 12,
            boxShadow: DS.shadowXs,
            backgroundImage: 'none',
          },
        },
      },
      MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: 9, paddingLeft: 16, paddingRight: 16, fontWeight: 600 },
          outlined: { borderColor: DS.aco, borderWidth: 1.5, color: DS.navy, '&:hover': { borderColor: DS.aco, backgroundColor: DS.navySoft } },
          text: { color: DS.ardosia },
        },
      },
      MuiTextField: { defaultProps: { size: 'small' } },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            backgroundColor: DS.surface,
            '& fieldset': { borderColor: DS.border },
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
        styleOverrides: {
          root: {
            minHeight: 40,
            textTransform: 'none',
            fontWeight: 600,
            // ciano é claro demais para texto sobre branco: seleção em navy,
            // com o indicador ciano carregando o acento (regra do kit)
            '&.Mui-selected': { color: DS.navy },
          },
        },
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
