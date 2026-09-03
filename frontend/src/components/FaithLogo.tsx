import { Box } from '@mui/material';

/**
 * Marca oficial "FAITH by XPTO" — assets do kit de marca (public/brand/*),
 * derivados do Brand Book XPTO Inc. v3.0. Nunca redesenhar: usar os lockups.
 *  - FaithMark: símbolo (contêiner navy + glifo ciano) para espaços quadrados
 *  - FaithLogo: lockup compacto (nome + endosso "by XPTO"), variante
 *    negativa para fundos navy/escuros e positiva para fundos claros
 */

export function FaithMark({ size = 36 }: { size?: number }) {
  return (
    <Box
      component="img"
      src="/brand/faith-icone-512.svg"
      alt="FAITH"
      sx={{ width: size, height: size, display: 'block', borderRadius: `${size * 0.175}px` }}
    />
  );
}

export function FaithLogo({
  size = 36,
  variant = 'negativo',
}: {
  size?: number;
  variant?: 'negativo' | 'positivo';
  /** compat: assinaturas antigas passavam subtitle; o lockup já carrega o endosso */
  subtitle?: string | null;
}) {
  // lockup compacto tem proporção ~3,55:1 (426×120)
  return (
    <Box
      component="img"
      src={variant === 'negativo' ? '/brand/faith-lockup-compacto-negativo.svg' : '/brand/faith-lockup-compacto.svg'}
      alt="FAITH by XPTO"
      sx={{ height: size, width: 'auto', display: 'block' }}
    />
  );
}
