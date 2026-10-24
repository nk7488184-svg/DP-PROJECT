"use client";

import { useEffect, useState } from "react";
import { MapContainer, Marker, useMapEvents, useMap, GeoJSON } from "react-leaflet";
import L from "leaflet";
import { MapPin, LocateFixed, Loader2, CheckCircle, AlertCircle } from "lucide-react";

const pinIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="background:#059669;width:22px;height:22px;border-radius:50%;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;"><div style="width:7px;height:7px;background:white;border-radius:50%;"></div></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function ClickHandler({
  onChange,
}: {
  onChange: (val: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    click(e) {
      onChange({
        lat: Number(e.latlng.lat.toFixed(5)),
        lng: Number(e.latlng.lng.toFixed(5)),
      });
    },
  });
  return null;
}

function MapFlyController({ target }: { target: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    if (target) {
      map.flyTo(target, 17, { animate: true, duration: 1.0 });
    }
  }, [target, map]);

  return null;
}

export default function LocationPickerInner({
  value,
  address,
  onChange,
  onAddressChange,
}: {
  value: { lat: number; lng: number } | null;
  address?: string;
  onChange: (val: { lat: number; lng: number }) => void;
  onAddressChange?: (addr: string) => void;
}) {
  const [gisLayers, setGisLayers] = useState<Record<string, any>>({});
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const [locSuccess, setLocSuccess] = useState(false);
  const [customAddress, setCustomAddress] = useState(address || "");
  const [flyTarget, setFlyTarget] = useState<[number, number] | null>(null);

  useEffect(() => {
    fetch("/gis/campus_all_gis.json")
      .then((r) => r.json())
      .then((d) => setGisLayers(d))
      .catch(() => {});
  }, []);

  const handleLocate = () => {
    setLocError(null);
    setLocSuccess(false);

    if (!navigator.geolocation) {
      setLocError("GPS is not supported by your browser.");
      return;
    }

    setLocating(true);

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 12000,
      maximumAge: 0,
    };

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5)),
        };
        onChange(coords);
        setFlyTarget([coords.lat, coords.lng]);
        setLocating(false);
        setLocSuccess(true);
        setTimeout(() => setLocSuccess(false), 4000);
      },
      (err) => {
        setLocating(false);
        let errorMsg = "Unable to retrieve your location.";
        if (err.code === err.PERMISSION_DENIED) {
          errorMsg = "Location permission was denied. Please allow location access in your browser.";
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          errorMsg = "GPS signal unavailable. Please ensure location services are enabled on your device.";
        } else if (err.code === err.TIMEOUT) {
          errorMsg = "Location request timed out. Retrying with network location...";
          navigator.geolocation.getCurrentPosition(
            (fallbackPos) => {
              const coords = {
                lat: Number(fallbackPos.coords.latitude.toFixed(5)),
                lng: Number(fallbackPos.coords.longitude.toFixed(5)),
              };
              onChange(coords);
              setFlyTarget([coords.lat, coords.lng]);
              setLocSuccess(true);
              setLocError(null);
              setTimeout(() => setLocSuccess(false), 4000);
            },
            () => {
              setLocError("Unable to acquire GPS fix. Please click directly on the map to drop pin.");
            },
            { enableHighAccuracy: false, timeout: 10000 }
          );
          return;
        }
        setLocError(errorMsg);
      },
      geoOptions
    );
  };

  const handleAddressUpdate = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAddress(e.target.value);
    if (onAddressChange) {
      onAddressChange(e.target.value);
    }
  };

  return (
    <div>
      <div className="relative w-full h-[320px] rounded-xl overflow-hidden border border-gray-200 shadow-inner bg-[#090d16] z-0 isolate">
        <style jsx global>{`
          .leaflet-tile-pane {
            display: none !important;
          }
        `}</style>
        <MapContainer
          center={value ? [value.lat, value.lng] : [31.7773, 76.9914]}
          zoom={16}
          attributionControl={false}
          scrollWheelZoom={true}
          dragging={true}
          touchZoom={true}
          doubleClickZoom={true}
          style={{ width: "100%", height: "100%", background: "#090d16" }}
        >
          {/* GIS Boundaries - non-interactive outline, NEVER blocks dragging or clicking */}
          {gisLayers.boundaries && (
            <GeoJSON
              data={gisLayers.boundaries}
              style={{ color: "#ef4444", weight: 2, dashArray: "6, 6", fill: false }}
              interactive={false}
            />
          )}

          {/* GIS Grounds */}
          {gisLayers.grounds && (
            <GeoJSON
              data={gisLayers.grounds}
              style={{ fillColor: "#22c55e", fillOpacity: 0.65, color: "#16a34a", weight: 2 }}
              onEachFeature={(feat, layer) => {
                const groundName = (feat.properties?.ground_name || feat.properties?.name || "Campus Ground").trim();
                layer.on("click", (e: any) => {
                  if (e.latlng) {
                    onChange({
                      lat: Number(e.latlng.lat.toFixed(5)),
                      lng: Number(e.latlng.lng.toFixed(5)),
                    });
                  }
                  if (groundName) {
                    const addr = `Near ${groundName}`;
                    setCustomAddress(addr);
                    if (onAddressChange) onAddressChange(addr);
                  }
                });
              }}
            />
          )}

          {/* GIS Roads reference */}
          {gisLayers.roads && (
            <GeoJSON
              data={gisLayers.roads}
              style={{ color: "#f59e0b", weight: 3.5, opacity: 0.9 }}
              onEachFeature={(feat, layer) => {
                const name = (feat.properties?.name || feat.properties?.road_name || "Campus Road").trim();
                layer.on("click", (e: any) => {
                  if (e.latlng) {
                    onChange({
                      lat: Number(e.latlng.lat.toFixed(5)),
                      lng: Number(e.latlng.lng.toFixed(5)),
                    });
                  }
                  if (name) {
                    setCustomAddress(name);
                    if (onAddressChange) onAddressChange(name);
                  }
                });
              }}
            />
          )}

          {/* GIS Pedestrian Paths */}
          {gisLayers.pedestrian_paths && (
            <GeoJSON
              data={gisLayers.pedestrian_paths}
              style={{ color: "#06b6d4", weight: 2, dashArray: "4, 4" }}
              interactive={false}
            />
          )}

          {/* GIS Buildings reference */}
          {gisLayers.buildings && (
            <GeoJSON
              data={gisLayers.buildings}
              style={{ fillColor: "#3b82f6", fillOpacity: 0.65, color: "#1d4ed8", weight: 1.5 }}
              onEachFeature={(feat, layer) => {
                const rawName =
                  feat.properties?.name ||
                  feat.properties?.building ||
                  feat.properties?.building_name ||
                  feat.properties?.building_id ||
                  feat.properties?.block_code ||
                  "";
                const cleanName = String(rawName).trim();
                const buildingName =
                  cleanName && cleanName !== "null" && cleanName !== "undefined"
                    ? cleanName
                    : feat.properties?.fid
                    ? `Building B-${feat.properties.fid}`
                    : "Campus Building";
                layer.on("click", (e: any) => {
                  if (e.latlng) {
                    onChange({
                      lat: Number(e.latlng.lat.toFixed(5)),
                      lng: Number(e.latlng.lng.toFixed(5)),
                    });
                  }
                  if (buildingName) {
                    const addr = `Near ${buildingName}`;
                    setCustomAddress(addr);
                    if (onAddressChange) onAddressChange(addr);
                  }
                });
              }}
            />
          )}

          <ClickHandler onChange={onChange} />
          <MapFlyController target={flyTarget} />
          {value && <Marker position={[value.lat, value.lng]} icon={pinIcon} />}
        </MapContainer>
      </div>

      {/* Notifications */}
      {locError && (
        <div className="mt-2.5 p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
          <span>{locError}</span>
        </div>
      )}

      {locSuccess && (
        <div className="mt-2.5 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-700">
          <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <span>GPS location captured and pinned accurately!</span>
        </div>
      )}

      {/* Coordinates + GPS Button */}
      <div className="flex items-center justify-between mt-3 gap-2">
        <div className="flex items-center gap-2 text-sm text-muted min-w-0">
          <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
          {value ? (
            <span className="font-mono text-foreground font-semibold text-xs sm:text-sm">
              Pinned: {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
            </span>
          ) : (
            <span className="text-xs text-muted">Click or drag map to pin, or tap &quot;Use GPS&quot;</span>
          )}
        </div>

        <button
          type="button"
          disabled={locating}
          onClick={handleLocate}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-white rounded-lg transition-all shadow-sm ${
            locating
              ? "bg-primary/70 cursor-wait"
              : "bg-primary hover:bg-primary-dark active:scale-95"
          }`}
        >
          {locating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Detecting...</span>
            </>
          ) : (
            <>
              <LocateFixed className="w-4 h-4" />
              <span>Use GPS</span>
            </>
          )}
        </button>
      </div>

      {/* Landmark / Location Name Input */}
      <div className="mt-3.5">
        <label className="block text-xs font-semibold text-foreground mb-1">
          Landmark / Road Name (e.g. Near Academic Block, Hostel Road)
        </label>
        <input
          type="text"
          value={customAddress}
          onChange={handleAddressUpdate}
          placeholder="e.g. Near North Campus Gate, Academic Block A..."
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>
    </div>
  );
}
