import { useEffect, useRef } from 'react';
import AMapLoader from '@amap/amap-jsapi-loader';

export type MapPoint = {
  id: number | string;
  latitude: number;
  longitude: number;
  title?: string;
  subtitle?: string;
};

type Props = {
  center: [number, number]; // [lat, lng]
  zoom?: number;
  height?: number | string;
  points?: MapPoint[];
  line?: boolean;
  highlightIndex?: number;
};

declare global {
  interface Window {
    _AMapSecurityConfig?: { securityJsCode?: string };
  }
}

export default function AmapMap({
  center,
  zoom = 12,
  height = 520,
  points = [],
  line = false,
  highlightIndex,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const AMapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);

  const renderOverlays = (AMap: any, map: any) => {
    overlaysRef.current.forEach((o) => {
      try {
        map.remove(o);
      } catch {
        // ignore
      }
    });
    overlaysRef.current = [];

    const path: [number, number][] = [];
    points.forEach((p, idx) => {
      if (p.latitude == null || p.longitude == null) return;
      const lnglat: [number, number] = [p.longitude, p.latitude];
      path.push(lnglat);
      const isHi = highlightIndex != null && idx === highlightIndex;
      const marker = new AMap.Marker({
        position: lnglat,
        title: p.title || '',
        ...(isHi
          ? {
              content:
                '<div style="width:14px;height:14px;border-radius:50%;background:#c2410c;border:2px solid #fff;box-shadow:0 0 0 2px #c2410c"></div>',
              offset: new AMap.Pixel(-7, -7),
            }
          : {}),
      });
      marker.setMap(map);
      if (p.title || p.subtitle) {
        marker.on('click', () => {
          const info = new AMap.InfoWindow({
            content: `<div style="padding:4px 8px"><strong>${
              p.title || ''
            }</strong><div>${p.subtitle || ''}</div></div>`,
            offset: new AMap.Pixel(0, -30),
          });
          info.open(map, lnglat);
        });
      }
      overlaysRef.current.push(marker);
    });

    if (line && path.length > 1) {
      const polyline = new AMap.Polyline({
        path,
        strokeColor: '#0f6e56',
        strokeWeight: 5,
        strokeOpacity: 0.9,
      });
      polyline.setMap(map);
      overlaysRef.current.push(polyline);
    }

    if (path.length === 1) {
      map.setZoomAndCenter(zoom, path[0]);
    } else if (path.length > 1) {
      if (highlightIndex != null && path[highlightIndex]) {
        map.setCenter(path[highlightIndex]);
      } else {
        map.setFitView(overlaysRef.current, false, [40, 40, 40, 40]);
      }
    } else {
      map.setZoomAndCenter(zoom, [center[1], center[0]]);
    }
  };

  useEffect(() => {
    const key = import.meta.env.VITE_AMAP_KEY as string | undefined;
    const security = import.meta.env.VITE_AMAP_SECURITY_CODE as string | undefined;
    if (!key || !containerRef.current) return;

    let cancelled = false;
    if (security) {
      window._AMapSecurityConfig = { securityJsCode: security };
    }

    AMapLoader.load({
      key,
      version: '2.0',
      plugins: ['AMap.Marker', 'AMap.Polyline', 'AMap.InfoWindow'],
    })
      .then((AMap) => {
        if (cancelled || !containerRef.current) return;
        AMapRef.current = AMap;
        const map = new AMap.Map(containerRef.current, {
          zoom,
          center: [center[1], center[0]],
          viewMode: '2D',
        });
        mapRef.current = map;
        renderOverlays(AMap, map);
      })
      .catch((err) => {
        console.error('AMap load failed', err);
      });

    return () => {
      cancelled = true;
      overlaysRef.current = [];
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
      AMapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapRef.current || !AMapRef.current) return;
    renderOverlays(AMapRef.current, mapRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, center, zoom, line, highlightIndex]);

  const key = import.meta.env.VITE_AMAP_KEY;
  if (!key) {
    return (
      <div
        style={{
          height,
          borderRadius: 12,
          background: '#fff7ed',
          border: '1px solid #fdba74',
          display: 'grid',
          placeItems: 'center',
          color: '#9a3412',
          padding: 16,
          textAlign: 'center',
        }}
      >
        未配置高德 Web Key。请在 apps/web/.env 填写 VITE_AMAP_KEY（及可选
        VITE_AMAP_SECURITY_CODE）后重启 Web。
      </div>
    );
  }

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
