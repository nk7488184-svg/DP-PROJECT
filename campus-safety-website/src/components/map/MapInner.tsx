"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { MapContainer, Marker, Popup, GeoJSON, LayersControl, LayerGroup, useMap } from "react-leaflet";
import L from "leaflet";
import { mockReports } from "@/lib/mock-data";
import { categoryLabels, categoryColors, type HazardCategory, type HazardReport } from "@/types";
import StatusBadge from "@/components/shared/StatusBadge";
import SeverityBadge from "@/components/shared/SeverityBadge";
import { fetchFromApi } from "@/lib/api";
import { MapPin } from "lucide-react";

function createIcon(color: string) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background:${color};width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

const targetPinIcon = L.divIcon({
  className: "target-highlight-marker",
  html: `
    <div style="position:relative;display:flex;align-items:center;justify-content:center;">
      <span style="position:absolute;width:34px;height:34px;border-radius:50%;background:#059669;opacity:0.6;animation:ping 1.4s cubic-bezier(0,0,0.2,1) infinite;"></span>
      <div style="width:22px;height:22px;background:#059669;border:3px solid white;border-radius:50%;box-shadow:0 2px 10px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:bold;">📍</div>
    </div>
  `,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

function MapFocusController({ targetCoords }: { targetCoords: [number, number] | null }) {
  const map = useMap();
  const flewRef = useRef(false);

  useEffect(() => {
    if (targetCoords && !flewRef.current) {
      map.flyTo(targetCoords, 17, { animate: true, duration: 1.2 });
      flewRef.current = true;
    }
  }, [targetCoords, map]);

  return null;
}

export default function MapInner({
  filterCategories,
}: {
  filterCategories?: string[];
}) {
  const [reports, setReports] = useState<HazardReport[]>(mockReports);
  const [gisLayers, setGisLayers] = useState<Record<string, any>>({});

  // Target coordinates & report from URL search params (?lat=...&lng=...&reportId=...)
  const [targetLocation, setTargetLocation] = useState<{ lat: number; lng: number; reportId?: string } | null>(null);

  const campusCenter: [number, number] = [31.7773, 76.9914];

  // Parse query params for target location on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const latStr = params.get("lat");
      const lngStr = params.get("lng");
      const reportId = params.get("reportId") || params.get("id") || undefined;

      if (latStr && lngStr) {
        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);
        if (!isNaN(lat) && !isNaN(lng)) {
          setTargetLocation({ lat, lng, reportId });
        }
      }
    }
  }, []);

  const loadReports = () => {
    fetchFromApi('/reports?limit=100')
      .then((res) => {
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setReports(res.data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadReports();
    const interval = setInterval(loadReports, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch('/gis/campus_all_gis.json')
      .then((r) => r.json())
      .then((d) => setGisLayers(d))
      .catch((err) => {
        console.warn("Could not load GIS layers:", err);
      });
  }, []);

  // Filter out resolved reports on public map so only active issues show (or targeted report)
  const filtered = useMemo(() => {
    let list = reports.filter((r) => r.status !== "resolved" || (targetLocation?.reportId && (r.id === targetLocation.reportId || (r as any)._id === targetLocation.reportId)));
    if (filterCategories?.length) {
      list = list.filter((r) => filterCategories.includes(r.category));
    }
    return list;
  }, [reports, filterCategories, targetLocation]);

  // Distinct styling: Grounds GREEN, Buildings BLUE
  const buildingStyle = {
    fillColor: "#3b82f6", // Vibrant Blue
    fillOpacity: 0.65,
    color: "#1d4ed8",
    weight: 1.5,
  };

  const groundStyle = {
    fillColor: "#22c55e", // Vibrant Green
    fillOpacity: 0.65,
    color: "#16a34a",
    weight: 2,
  };

  const roadStyle = {
    color: "#f59e0b",
    weight: 3.5,
    opacity: 0.9,
  };

  const pathStyle = {
    color: "#06b6d4",
    weight: 2,
    dashArray: "4, 4",
  };

  const boundaryStyle = {
    color: "#ef4444",
    weight: 2,
    dashArray: "6, 6",
    fill: false,
  };

  return (
    <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}>
      {/* Target Location Alert Banner (when directed from Track Report) */}
      {targetLocation && (
        <div className="absolute top-4 right-14 z-[1000] bg-emerald-50 border border-emerald-300 text-emerald-800 px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2 text-xs backdrop-blur-md">
          <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>
            Report Pinned: <strong className="font-mono">{targetLocation.lat.toFixed(5)}, {targetLocation.lng.toFixed(5)}</strong>
            {targetLocation.reportId && ` (${targetLocation.reportId})`}
          </span>
          <button
            type="button"
            onClick={() => setTargetLocation(null)}
            className="ml-2 text-emerald-700 hover:text-emerald-900 text-xs underline font-semibold"
          >
            Clear
          </button>
        </div>
      )}

      {/* Clean Campus GIS map styling */}
      <style jsx global>{`
        .leaflet-tile-pane {
          display: none !important;
        }
        .leaflet-control-attribution {
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
          pointer-events: none !important;
        }
        .leaflet-container {
          background: #090d16 !important;
        }
      `}</style>

      <MapContainer
        center={targetLocation ? [targetLocation.lat, targetLocation.lng] : campusCenter}
        zoom={targetLocation ? 17 : 15}
        attributionControl={false}
        style={{ width: "100%", height: "100%", background: "#090d16" }}
        scrollWheelZoom={true}
      >
        <MapFocusController targetCoords={targetLocation ? [targetLocation.lat, targetLocation.lng] : null} />

        <LayersControl position="topright">
          {/* 1. Boundaries (Non-interactive border line, never intercepts clicks) */}
          {gisLayers.boundaries && (
            <LayersControl.Overlay checked name="Campus Boundaries">
              <GeoJSON
                data={gisLayers.boundaries}
                style={boundaryStyle}
                interactive={false}
              />
            </LayersControl.Overlay>
          )}

          {/* 2. Grounds / Sports Fields (GREEN color, with Cricket/Football/etc names) */}
          {gisLayers.grounds && (
            <LayersControl.Overlay checked name="Grounds / Fields">
              <GeoJSON
                data={gisLayers.grounds}
                style={groundStyle}
                onEachFeature={(feat, layer) => {
                  const groundName = (feat.properties?.ground_name || feat.properties?.name || "Campus Ground").trim();
                  layer.bindPopup(`
                    <div style="font-family:sans-serif;min-width:140px;padding:4px;">
                      <div style="font-size:10px;text-transform:uppercase;color:#22c55e;font-weight:700;letter-spacing:0.5px;margin-bottom:2px;">⚽ Sports Facility / Ground</div>
                      <div style="font-size:14px;font-weight:700;color:#0f172a;">${groundName}</div>
                      <div style="font-size:11px;color:#64748b;margin-top:2px;">IIT Mandi Campus</div>
                    </div>
                  `);
                  layer.bindTooltip(`⚽ ${groundName}`, { sticky: true, direction: "top" });
                  layer.on({
                    mouseover: (e) => {
                      e.target.setStyle({ fillOpacity: 0.85, weight: 2.5, fillColor: "#4ade80" });
                    },
                    mouseout: (e) => {
                      e.target.setStyle({ fillOpacity: 0.65, weight: 2, fillColor: "#22c55e" });
                    },
                  });
                }}
              />
            </LayersControl.Overlay>
          )}

          {/* 3. Campus Roads */}
          {gisLayers.roads && (
            <LayersControl.Overlay checked name="Campus Roads (GIS)">
              <GeoJSON
                data={gisLayers.roads}
                style={roadStyle}
                onEachFeature={(feat, layer) => {
                  const name = (feat.properties?.name || feat.properties?.road_name || "Campus Road").trim();
                  layer.bindPopup(`
                    <div style="font-family:sans-serif;min-width:130px;padding:4px;">
                      <div style="font-size:10px;text-transform:uppercase;color:#f59e0b;font-weight:700;letter-spacing:0.5px;margin-bottom:2px;">🛣️ Campus Road</div>
                      <div style="font-size:13px;font-weight:700;color:#0f172a;">${name}</div>
                    </div>
                  `);
                  layer.bindTooltip(`🛣️ ${name}`, { sticky: true, direction: "top" });
                }}
              />
            </LayersControl.Overlay>
          )}

          {/* 4. Pedestrian Paths */}
          {gisLayers.pedestrian_paths && (
            <LayersControl.Overlay checked name="Pedestrian Paths">
              <GeoJSON
                data={gisLayers.pedestrian_paths}
                style={pathStyle}
              />
            </LayersControl.Overlay>
          )}

          {/* 5. Campus Buildings (BLUE color, real names for North and South Campus like B9, STP, A-16, etc.) */}
          {gisLayers.buildings && (
            <LayersControl.Overlay checked name="Campus Buildings (GIS)">
              <GeoJSON
                data={gisLayers.buildings}
                style={buildingStyle}
                onEachFeature={(feat, layer) => {
                  const rawName = 
                    feat.properties?.name || 
                    feat.properties?.building || 
                    feat.properties?.building_name || 
                    feat.properties?.building_id || 
                    feat.properties?.block_code || 
                    "";
                  const cleanName = String(rawName).trim();
                  const buildingName = cleanName && cleanName !== "null" && cleanName !== "undefined"
                    ? cleanName
                    : (feat.properties?.fid ? `Building B-${feat.properties.fid}` : "Campus Building");
                  
                  const blockCode = feat.properties?.block_code;
                  const buildingType = feat.properties?.building_type;

                  layer.bindPopup(`
                    <div style="font-family:sans-serif;min-width:140px;padding:4px;">
                      <div style="font-size:10px;text-transform:uppercase;color:#3b82f6;font-weight:700;letter-spacing:0.5px;margin-bottom:2px;">🏛️ Campus Building</div>
                      <div style="font-size:14px;font-weight:700;color:#0f172a;">${buildingName}</div>
                      ${buildingType ? `<div style="font-size:11px;color:#475569;margin-top:2px;">Type: ${buildingType}</div>` : ""}
                      ${blockCode ? `<div style="font-size:11px;color:#64748b;margin-top:1px;">Block: ${blockCode}</div>` : ""}
                      <div style="font-size:10px;color:#94a3b8;margin-top:3px;">IIT Mandi Campus</div>
                    </div>
                  `);
                  layer.bindTooltip(`🏛️ ${buildingName}`, { sticky: true, direction: "top" });
                  layer.on({
                    mouseover: (e) => {
                      e.target.setStyle({ fillOpacity: 0.85, weight: 2.5, fillColor: "#60a5fa", color: "#93c5fd" });
                    },
                    mouseout: (e) => {
                      e.target.setStyle({ fillOpacity: 0.65, weight: 1.5, fillColor: "#3b82f6", color: "#1d4ed8" });
                    },
                  });
                }}
              />
            </LayersControl.Overlay>
          )}

          {/* 6. Active Hazards */}
          <LayersControl.Overlay checked name="Active Hazards">
            <LayerGroup>
              {filtered.map((report) => (
                <Marker
                  key={report.id || (report as any)._id}
                  position={[report.location?.lat || 31.7754, report.location?.lng || 76.9861]}
                  icon={createIcon(categoryColors[report.category as HazardCategory] || '#ef4444')}
                >
                  <Popup>
                    <div className="min-w-[200px]">
                      <h3 className="font-semibold text-sm mb-1">{report.title}</h3>
                      <p className="text-xs text-gray-500 mb-2">{report.location?.address}</p>
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                          style={{ backgroundColor: categoryColors[report.category as HazardCategory] || '#64748b' }}
                        >
                          {categoryLabels[report.category as HazardCategory] || report.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <SeverityBadge severity={report.severity} />
                        <StatusBadge status={report.status} />
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        {report.reportedAt ? new Date(report.reportedAt).toLocaleDateString() : 'Recent'}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </LayerGroup>
          </LayersControl.Overlay>
        </LayersControl>

        {/* Targeted Highlight Pin (when directed from track page) */}
        {targetLocation && (
          <Marker
            position={[targetLocation.lat, targetLocation.lng]}
            icon={targetPinIcon}
          >
            <Popup autoClose={false}>
              <div className="min-w-[180px] p-1 text-gray-900">
                <span className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded mb-1">
                  PINNED REPORT
                </span>
                {targetLocation.reportId && (
                  <p className="font-mono text-xs font-bold text-emerald-600 mb-1">{targetLocation.reportId}</p>
                )}
                <p className="font-mono text-[11px] text-gray-600">
                  GPS: {targetLocation.lat.toFixed(5)}, {targetLocation.lng.toFixed(5)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}