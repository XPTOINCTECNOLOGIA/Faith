import { describe, expect, it } from 'vitest';
import { isValidCnpj, normalizeCnpj } from './cnpj';

describe('isValidCnpj (RN-006)', () => {
  it('aceita CNPJ válido com e sem máscara', () => {
    expect(isValidCnpj('33.683.111/0001-07')).toBe(true); // SERPRO
    expect(isValidCnpj('33683111000107')).toBe(true);
  });

  it('rejeita dígito verificador errado', () => {
    expect(isValidCnpj('33.683.111/0001-08')).toBe(false);
  });

  it('rejeita sequências repetidas e tamanhos errados', () => {
    expect(isValidCnpj('11111111111111')).toBe(false);
    expect(isValidCnpj('123')).toBe(false);
    expect(isValidCnpj('')).toBe(false);
  });

  it('normaliza removendo máscara', () => {
    expect(normalizeCnpj('33.683.111/0001-07')).toBe('33683111000107');
  });
});
