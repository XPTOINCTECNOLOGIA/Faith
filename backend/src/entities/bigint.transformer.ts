import type { ValueTransformer } from 'typeorm';

/** Postgres bigint chega como string no driver pg; a API trabalha com number. */
export const bigint: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value == null ? value : Number(value)),
};

export const numericMoney: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value == null ? value : Number(value)),
};
