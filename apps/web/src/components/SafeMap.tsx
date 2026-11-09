import { useEffect, useState, type ReactNode } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import type { LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Props = {
  center: LatLngExpression;
  zoom?: number;
  children?: ReactNode;
  height?: number | string;
};

/**
 * 延迟挂载 MapContainer，避免 React StrictMode 双挂载导致 Leaflet 白屏。
 */
export default function SafeMap({
  center,
  zoom = 12,
  children,
  height = 520,
}: Props) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), 0);
    return () => {
      window.clearTimeout(t);
      setReady(false);
    };
  }, []);

  if (!ready) {
    return (
      <div
        style={{
          height,
          borderRadius: 12,
          background: '#e8eeea',
          display: 'grid',
          placeItems: 'center',
          color: '#51665c',
        }}
      >
        地图加载中…
      </div>
    );
  }

  return (
    <div style={{ height, borderRadius: 12, overflow: 'hidden' }}>
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {children}
      </MapContainer>
    </div>
  );
}
