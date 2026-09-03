import { useEffect } from 'react';
import { GlobalStyles } from '@mui/material';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { brl0, type PinGroup } from '../lib/geo';
import { DS } from '../theme';

/**
 * Mapa geográfico do FAITH (Leaflet + CARTO claro), com os pins da marca.
 * Reutilizado pelo Mapa Global (tela cheia) e pelo Dashboard (painel).
 * Carregar sempre via lazy() — o Leaflet fica fora do bundle inicial.
 */

function FitBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (points.length) {
      map.fitBounds(L.latLngBounds(points.map(([a, b]) => L.latLng(a, b))), { padding: [48, 48], maxZoom: 5 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.length]);
  return null;
}

export default function GeoMap({
  groups,
  onPinClick,
  interactive = true,
}: {
  groups: PinGroup[];
  onPinClick?: (g: PinGroup) => void;
  interactive?: boolean;
}) {
  return (
    <>
      <GlobalStyles
        styles={{
          '.faith-pin': { background: 'transparent', border: 'none' },
          '.faith-pin-inner': {
            width: 38,
            height: 38,
            borderRadius: '50% 50% 50% 4px',
            transform: 'rotate(-45deg)',
            background: `linear-gradient(135deg, ${DS.primary}, #3b82f6)`,
            border: '2.5px solid #ffffff',
            boxShadow: '0 6px 16px rgba(16,24,40,.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform .15s ease',
          },
          '.faith-pin-inner:hover': { transform: 'rotate(-45deg) scale(1.12)' },
          '.faith-pin-inner span': {
            transform: 'rotate(45deg)',
            color: '#fff',
            fontWeight: 800,
            fontSize: 14,
            fontFamily: 'Inter, sans-serif',
          },
          '.faith-pin-inner.is-won': { background: 'linear-gradient(135deg, #0f9d58, #12b76a)' },
          '.leaflet-container': { fontFamily: 'Inter, sans-serif' },
        }}
      />
      <MapContainer
        center={[-15, -50]}
        zoom={4}
        minZoom={2}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={interactive}
        dragging={interactive}
        zoomControl={interactive}
        worldCopyJump
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        <FitBounds points={groups.map((g) => [g.lat, g.lng] as [number, number])} />
        {groups.map((g) => (
          <Marker
            key={g.key}
            position={[g.lat, g.lng]}
            icon={L.divIcon({
              className: 'faith-pin',
              html: `<div class="faith-pin-inner${g.promovidas === g.items.length ? ' is-won' : ''}" title="${g.titulo} · ${brl0(g.total)}"><span>${g.items.length}</span></div>`,
              iconSize: [38, 38],
              iconAnchor: [19, 34],
            })}
            eventHandlers={onPinClick ? { click: () => onPinClick(g) } : undefined}
          />
        ))}
      </MapContainer>
    </>
  );
}
