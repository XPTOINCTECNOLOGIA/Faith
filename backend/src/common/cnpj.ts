/** Validação de CNPJ com dígitos verificadores (RN-006). Aceita com/sem máscara. */
export function isValidCnpj(raw: string): boolean {
  const cnpj = raw.replace(/\D/g, '');
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const digit = (slice: string, weights: number[]) => {
    const sum = weights.reduce((acc, w, i) => acc + Number(slice[i]) * w, 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };

  const d1 = digit(cnpj, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = digit(cnpj, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return d1 === Number(cnpj[12]) && d2 === Number(cnpj[13]);
}

export function normalizeCnpj(raw: string): string {
  return raw.replace(/\D/g, '');
}
