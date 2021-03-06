import { useEffect, useState } from 'react';
import Leaflet from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import useGoogleSheets from 'use-google-sheets';
import { Sheet } from 'use-google-sheets/dist/types';
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';

import { PopupRow } from './PopupRow';
import { useSearchParams } from 'react-router-dom';
import geoindex from './geoindex.json';
import elasticlunr from 'elasticlunr';

import './App.scss';

type Place = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  regionNames: string[];
};

declare global {
  interface Window {
    index: elasticlunr.Index<Place> | null | undefined;
  }
}

const markerIcon = Leaflet.icon({
  iconUrl: markerIconUrl,
  shadowUrl: markerShadowUrl,
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

function getRows(data: Sheet[]) {
  return data[0]?.data ?? [];
}

type PointData = { lat: number; lon: number; rowData: any };

async function getPoints(
  rows: any[],
  locationLabel: string | null,
  coordsLabels: string[] | null
): Promise<PointData[]> {
  async function getLoc(row: any) {
    if (coordsLabels) {
      const lat = parseFloat(row[coordsLabels[0]]);
      const lon = parseFloat(row[coordsLabels[1]]);

      if (lat && lon) {
        return { lat, lon };
      }
    }

    if (locationLabel && window.index) {
      // fetch location from geoindex
      const location = row[locationLabel];
      if (!location) return null;

      const res = window.index.search(location);

      if (!res.length) return null;

      const doc = window.index.documentStore.getDoc(res[0]?.ref);
      return { lat: doc.lat, lon: doc.lon };
    }

    return null;
  }

  async function getPointsAsync(row: any) {
    const loc = await getLoc(row);
    if (!loc) return null;

    const { lat, lon } = loc;
    return { lat, lon, rowData: row };
  }

  return (await Promise.all(rows.map((row) => getPointsAsync(row)))).filter(
    (point): point is PointData => !!point
  );
}

function App() {
  const [searchParams] = useSearchParams();
  const sheetId = searchParams.get('id') ?? '';

  const coordsLabels = searchParams.get('coordsLabels')?.split(',');
  const locationLabel = searchParams.get('locationLabel');

  const labels = searchParams.get('labels')?.split(',') ?? [];

  const { data, loading } = useGoogleSheets({
    apiKey: process.env.REACT_APP_API_KEY ?? '',
    sheetId,
  });

  const [prevData, setPrevData] = useState<string>();
  const [points, setPoints] = useState<PointData[]>([]);

  useEffect(() => {
    window.index = elasticlunr.Index.load<Place>(geoindex as any);

    return () => {
      window.index = null;
    };
  }, []);

  useEffect(() => {
    const preparePoints = async () => {
      if (!loading && JSON.stringify(data) !== prevData) {
        const points = await getPoints(
          getRows(data),
          locationLabel,
          coordsLabels ?? null
        );
        setPoints(points);
      }
    };

    preparePoints();

    setPrevData(JSON.stringify(data));
  }, [loading, data, prevData, coordsLabels, locationLabel]);

  const position: [number, number] = [51.1087443, 17.0143368];

  return (
    <div className="app">
      <MapContainer className="map" center={position} zoom={13}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {points.map((point, id) => (
          <Marker
            key={id}
            position={[point.lat + Math.random() * 0.01, point.lon]}
            icon={markerIcon}
          >
            <Popup maxWidth={500} closeButton={false}>
              {labels.map((label) => (
                <PopupRow
                  key={label}
                  label={label}
                  text={point.rowData[label]}
                />
              ))}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default App;
