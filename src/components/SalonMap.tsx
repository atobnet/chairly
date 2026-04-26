'use client'

import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { Salon } from '@/types'

const fixLeafletIcon = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  })
}

function createDotIcon(selected: boolean) {
  return L.divIcon({
    className: '',
    html: `<div style="
      width: ${selected ? '14px' : '10px'};
      height: ${selected ? '14px' : '10px'};
      border-radius: 50%;
      background: ${selected ? '#111111' : '#ffffff'};
      border: 2px solid #111111;
      box-shadow: ${selected ? '0 0 0 3px rgba(17,17,17,0.15)' : '0 1px 3px rgba(0,0,0,0.2)'};
      transition: all 0.15s;
    "></div>`,
    iconSize: [selected ? 14 : 10, selected ? 14 : 10],
    iconAnchor: [selected ? 7 : 5, selected ? 7 : 5],
  })
}

// 選択時に地図の中心を移動するコンポーネント
function MapFlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([lat, lng], 14, { duration: 0.6 })
  }, [lat, lng])
  return null
}

interface SalonMapProps {
  salons: (Salon & { profiles?: { name: string } })[]
  selectedSalonId: string | null
  onSelect: (salon: Salon & { profiles?: { name: string } }) => void
}

export default function SalonMap({ salons, selectedSalonId, onSelect }: SalonMapProps) {
  useEffect(() => { fixLeafletIcon() }, [])

  const salonWithCoords = salons.filter(s => s.lat != null && s.lng != null)
  if (salonWithCoords.length === 0) return null

  const center: [number, number] = [
    salonWithCoords.reduce((sum, s) => sum + (s.lat ?? 0), 0) / salonWithCoords.length,
    salonWithCoords.reduce((sum, s) => sum + (s.lng ?? 0), 0) / salonWithCoords.length,
  ]

  const selected = salonWithCoords.find(s => s.id === selectedSalonId)

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: '260px', width: '100%' }}
      scrollWheelZoom={false}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
      />
      {selected && <MapFlyTo lat={selected.lat!} lng={selected.lng!} />}
      {salonWithCoords.map(salon => (
        <Marker
          key={salon.id}
          position={[salon.lat!, salon.lng!]}
          icon={createDotIcon(selectedSalonId === salon.id)}
          zIndexOffset={selectedSalonId === salon.id ? 1000 : 0}
          eventHandlers={{ click: () => onSelect(salon) }}
        />
      ))}
    </MapContainer>
  )
}
