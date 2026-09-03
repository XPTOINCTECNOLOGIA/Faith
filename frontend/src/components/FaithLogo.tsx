import { Box, Stack, Typography } from '@mui/material';

/**
 * Marca da aplicação FAITH (Portal de Oportunidades XPTO + SERPRO).
 * Ícone: escudo com check — confiança + governança documental (RN-001).
 * Fonte única da marca no front; o favicon (public/favicon.svg) espelha o ícone.
 */
export function FaithMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="FAITH">
      <defs>
        <linearGradient id="faith-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60cfe2" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#faith-g)" />
      <path
        d="M24 9.5c4.1 2.5 8.2 3.8 12 4.2v10.1c0 7.4-4.8 12.6-12 15.7-7.2-3.1-12-8.3-12-15.7V13.7c3.8-.4 7.9-1.7 12-4.2z"
        fill="none"
        stroke="#0b1323"
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      <path
        d="M17.5 24.5l4.6 4.8 8.4-9.6"
        fill="none"
        stroke="#0b1323"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FaithLogo({
  size = 36,
  subtitle = 'Portal de Oportunidades',
}: {
  size?: number;
  subtitle?: string | null;
}) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <FaithMark size={size} />
      <Box>
        <Typography
          component="div"
          sx={{ fontWeight: 800, letterSpacing: '0.18em', lineHeight: 1.05, fontSize: size * 0.5 }}
        >
          FAITH
        </Typography>
        {subtitle && (
          <Typography component="div" variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.1 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Stack>
  );
}
