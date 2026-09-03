import { radarParseBRL, type RadarOpportunity } from './types';

/**
 * Geografia determinística do FAITH (sem geocodificação externa):
 * capitais das 27 UFs, capitais dos países atendidos e municípios conhecidos.
 * Município fora da tabela cai na capital da UF.
 */

export const UF_CAPITAL: Record<string, [number, number]> = {
  AC: [-9.975, -67.8243], AL: [-9.666, -35.735], AM: [-3.1019, -60.025],
  AP: [0.0349, -51.0694], BA: [-12.9718, -38.5011], CE: [-3.7172, -38.5433],
  DF: [-15.7797, -47.9297], ES: [-20.3155, -40.3128], GO: [-16.6864, -49.2643],
  MA: [-2.5307, -44.3068], MG: [-19.9167, -43.9345], MS: [-20.4697, -54.6201],
  MT: [-15.601, -56.0974], PA: [-1.455, -48.5024], PB: [-7.1151, -34.8641],
  PE: [-8.0543, -34.8813], PI: [-5.0892, -42.8016], PR: [-25.4284, -49.2733],
  RJ: [-22.9068, -43.1729], RN: [-5.7945, -35.211], RO: [-8.7608, -63.8999],
  RR: [2.8197, -60.6733], RS: [-30.0346, -51.2177], SC: [-27.5954, -48.548],
  SE: [-10.9472, -37.0731], SP: [-23.5505, -46.6333], TO: [-10.2491, -48.3243],
};

export const PAIS_CAPITAL: Record<string, [number, number]> = {
  Brasil: [-15.7797, -47.9297], Guiana: [6.8013, -58.1551], Angola: [-8.839, 13.2894],
  'Moçambique': [-25.9692, 32.5732], 'Cabo Verde': [14.933, -23.5133],
  Argentina: [-34.6037, -58.3816], Paraguai: [-25.2637, -57.5759],
  Uruguai: [-34.9011, -56.1645], Chile: [-33.4489, -70.6693],
  'Colômbia': [4.711, -74.0721], Peru: [-12.0464, -77.0428],
  Portugal: [38.7223, -9.1393], 'Estados Unidos': [38.9072, -77.0369],
  'México': [19.4326, -99.1332], Suriname: [5.852, -55.2038],
  'Bolívia': [-16.4897, -68.1193], Equador: [-0.1807, -78.4678], Venezuela: [10.4806, -66.9036],
};

export const CIDADE: Record<string, [number, number]> = {
  'itaguaí/RJ': [-22.8636, -43.7798],
  'salvador/BA': [-12.9718, -38.5011],
  'bagé/RS': [-31.3297, -54.1069],
  'niterói/RJ': [-22.8832, -43.1034],
  'campinas/SP': [-22.9099, -47.0626],
  'recife/PE': [-8.0543, -34.8813],
};

export function coordDe(r: RadarOpportunity): [number, number] | null {
  if (r.esfera === 'Municipal') {
    return CIDADE[`${r.cidade.toLowerCase()}/${r.uf}`] ?? UF_CAPITAL[r.uf] ?? null;
  }
  if (r.esfera === 'Estadual') return UF_CAPITAL[r.uf] ?? null;
  return PAIS_CAPITAL[r.pais] ?? null;
}

export interface PinGroup {
  key: string;
  lat: number;
  lng: number;
  titulo: string;
  items: RadarOpportunity[];
  total: number;
  promovidas: number;
}

export function buildPinGroups(items: RadarOpportunity[]): PinGroup[] {
  const map = new Map<string, PinGroup>();
  for (const r of items) {
    const coord = coordDe(r);
    if (!coord) continue;
    const key = coord.join(',');
    const titulo =
      r.esfera === 'Municipal' ? `${r.cidade}/${r.uf}` : r.esfera === 'Estadual' ? `${r.uf} — capital` : r.pais;
    const g = map.get(key) ?? { key, lat: coord[0], lng: coord[1], titulo, items: [], total: 0, promovidas: 0 };
    g.items.push(r);
    g.total += radarParseBRL(r.valor_estimado_total_contrato);
    if (r.opportunity_id) g.promovidas += 1;
    map.set(key, g);
  }
  return [...map.values()];
}

export const brl0 = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
