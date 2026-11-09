import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type MapPoint = {
  id: number | string;
  latitude: number;
  longitude: number;
  title?: string;
  subtitle?: string;
};

type Props = {
  center: [number, number];
  zoom?: number;
  height?: number | string;
  points?: MapPoint[];
  line?: boolean;
};

const defaultIcon = L.icon({
  iconUrl: '/marker-icon.png',
  iconRetinaUrl: '/marker-icon-2x.png',
  shadowUrl: '/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

/**
 * 原生 Leaflet（不用 react-leaflet），避免 Context/StrictMode 白屏。
 * 瓦片优先用高德道路图（国内更稳），失败时可换 OSM。
 */
export default function LeafletMap({
  center,
  zoom = 12,
  height = 520,
  points = [],
  line = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layerRef = useRef<L.LayerGroup | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center,
      zoom,
      scrollWheelZoom: true,
    });

    // 国内可访问性更好的瓦片
    L.tileLayer(
      'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
      {
        subdomains: '1234',
        maxZoom: 18,
        attribution: '© 高德',
      },
    ).addTo(map);

    layerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    // 容器刚显示时需要 invalidateSize
    const t = window.setTimeout(() => map.invalidateSize(), 80);

    return () => {
      window.clearTimeout(t);
      map.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
    // 仅初始化一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const layer = layerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();
    const latlngs: L.LatLngExpression[] = [];

    points.forEach((p) => {
      if (p.latitude == null || p.longitude == null) return;
      const ll: L.LatLngExpression = [p.latitude, p.longitude];
      latlngs.push(ll);
      const marker = L.marker(ll, { icon: defaultIcon });
      const html = `<div><strong>${p.title || ''}</strong><div>${p.subtitle || ''}</div></div>`;
      marker.bindPopup(html);
      marker.addTo(layer);
    });

    if (line && latlngs.length > 1) {
      L.polyline(latlngs, { color: '#0f6e56', weight: 4 }).addTo(layer);
    }

    if (latlngs.length === 1) {
      map.setView(latlngs[0], zoom);
    } else if (latlngs.length > 1) {
      map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40] });
    } else {
      map.setView(center, zoom);
    }

    window.setTimeout(() => map.invalidateSize(), 50);
  }, [points, center, zoom, line]);

  return (
    <div
      ref={containerRef}
      style={{
        height,
        width: '100%',
        borderRadius: 12,
        overflow: 'hidden',
        background: '#e8eeea',
      }}
    />
  );
}
