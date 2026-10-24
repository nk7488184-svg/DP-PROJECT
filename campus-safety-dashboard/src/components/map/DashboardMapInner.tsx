"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import { MapContainer, Marker, Popup, GeoJSON, LayersControl, LayerGroup, useMap } from "react-leaflet";
import L from "leaflet";
import { mockReports } from "@/lib/mock-data";
import { categoryLabels, categoryColors, severityLabels, statusLabels, type HazardCategory, type HazardReport } from "@/types";
import { fetchFromApi } from "@/lib/api";
import { MapPin } from "lucide-react";

function createHazardIcon(color: string, severity?: string) {
  const pulse = severity === "critical" ? "box-shadow: 0 0 0 4px rgba(239,68,68,0.4); animation: pulse 1.5s infinite;" : "";
  return L.divIcon({
    className: "custom-hazard-marker",
    html: `<div style="background:${color};width:16px;height:16px;border-radius:50%;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.5);${pulse}"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

const targetPinIcon = L.divIcon({
  className: "target-highlight-marker",
  html: `
    <div style="position:relative;display:flex;align-items:center;justify-content:center;">
      <span style="position:absolute;width:34px;height:34px;border-radius:50%;background:#10b981;opacity:0.6;animation:ping 1.4s cubic-bezier(0,0,0.2,1) infinite;"></span>
      <div style="width:22px;height:22px;background:#10b981;border:3px solid white;border-radius:50%;box-shadow:0 2px 10px rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:bold;">📍</div>
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

export default function DashboardMapInner({
  filterCategories,
  filterSeverities,
  showResolved = false,
  showHeatmap,
}: {
  filterCategories?: string[];
  filterSeverities?: string[];
  showResolved?: boolean;
  showHeatmap?: boolean;
}) {
  const [reports, setReports] = useState<HazardReport[]>(mockReports);
  const [gisLayers, setGisLayers] = useState<Record<string, any>>({});
  const [loadingGis, setLoadingGis] = useState(true);

  // Target coordinates & report passed via URL query params (?lat=...&lng=...&reportId=...)
  const [targetLocation, setTargetLocation] = useState<{ lat: number; lng: number; reportId?: string } | null>(null);

  // Center of IIT Mandi campus (South & North)
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

  // Load real-time reports from API
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

  // Load GIS layers
  useEffect(() => {
    fetch('/gis/campus_all_gis.json')
      .then((r) => r.json())
      .then((data) => {
        setGisLayers(data);
        setLoadingGis(false);
      })
      .catch(() => {
        fetch('http://localhost:3001/gis/campus_all_gis.json')
          .then((r) => r.json())
          .then((data) => {
            setGisLayers(data);
            setLoadingGis(false);
          })
          .catch((err) => {
            console.warn("Could not load GIS layers:", err);
            setLoadingGis(false);
          });
      });
  }, []);

  // Filter reports: HIDE resolved hazards by default unless explicitly toggled on OR it matches targeted reportId
  const filtered = useMemo(() => {
    let list = reports;
    
    if (!showResolved) {
      list = list.filter((r) => r.status !== "resolved" || (targetLocation?.reportId && (r.id === targetLocation.reportId || (r as any)._id === targetLocation.reportId)));
    }

    if (filterCategories?.length) {
      list = list.filter((r) => filterCategories.includes(r.category));
    }
    if (filterSeverities?.length) {
      list = list.filter((r) => filterSeverities.includes(r.severity));
    }
    return list;
  }, [reports, filterCategories, filterSeverities, showResolved, targetLocation]);

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
    opacity: 0.85,
  };

  const boundaryStyle = {
    color: "#ef4444",
    weight: 2,
    dashArray: "6, 6",
    fill: false,
    interactive: false,
  };

  return (
    <div className="relative w-full h-full min-h-[500px]">
      {/* Target Location Alert Banner (when opened from Reports Table) */}
      {targetLocation && (
        <div className="absolute top-3 left-14 z-[1000] bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 px-3 py-1.5 rounded-lg shadow-lg flex items-center gap-2 text-xs backdrop-blur-md">
          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>
            Target pinned: <strong className="font-mono text-white">{targetLocation.lat.toFixed(5)}, {targetLocation.lng.toFixed(5)}</strong>
            {targetLocation.reportId && ` (${targetLocation.reportId})`}
          </span>
          <button
            type="button"
            onClick={() => setTargetLocation(null)}
            className="ml-2 text-emerald-400 hover:text-white text-xs underline"
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
        style={{ width: "100%", height: "100%", minHeight: "500px", background: "#090d16" }}
        scrollWheelZoom={true}
      >
        <MapFocusController targetCoords={targetLocation ? [targetLocation.lat, targetLocation.lng] : null} />

        <LayersControl position="topright">
          {/* 1. Campus Boundaries (Non-interactive border line, never intercepts clicks) */}
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
            <LayersControl.Overlay checked name="Grounds / Sports Fields">
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
                onEachFeature={(feat, layer) => {
                  layer.bindPopup(`<div class="text-xs"><strong>🚶 Pedestrian Path</strong></div>`);
                }}
              />
            </LayersControl.Overlay>
          )}

          {/* 5. Campus Buildings (BLUE color, real names for North and South Campus like B9, STP, A-16, etc.) */}
          {gisLayers.buildings && (
            <LayersControl.Overlay checked name="Campus Buildings">
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

          {/* 6. Active Hazard Reports Overlay */}
          <LayersControl.Overlay checked name="Active Hazards (Unresolved)">
            <LayerGroup>
              {filtered.map((report) => (
                <Marker
                  key={report.id || (report as any)._id}
                  position={[report.location?.lat || 31.7754, report.location?.lng || 76.9861]}
                  icon={createHazardIcon(categoryColors[report.category as HazardCategory] || "#ef4444", report.severity)}
                >
                  <Popup>
                    <div className="min-w-[200px] text-gray-900 p-1">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="font-mono text-xs font-bold text-primary">{report.id}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold uppercase text-white" style={{ backgroundColor: categoryColors[report.category as HazardCategory] || '#64748b' }}>
                          {categoryLabels[report.category as HazardCategory] || report.category}
                        </span>
                      </div>
                      <h3 className="font-semibold text-sm mb-1">{report.title}</h3>
                      <p className="text-xs text-gray-600 mb-2">{report.location?.address}</p>
                      <div className="grid grid-cols-2 gap-1 text-xs border-t pt-1.5 mt-1">
                        <div><strong>Severity:</strong> {severityLabels[report.severity] || report.severity}</div>
                        <div><strong>Status:</strong> {statusLabels[report.status] || report.status}</div>
                      </div>
                      {report.description && (
                        <p className="text-xs text-gray-500 mt-1 italic line-clamp-2">{report.description}</p>
                      )}
                      <p className="text-[10px] text-gray-400 mt-2">
                        Reported: {report.reportedAt ? new Date(report.reportedAt).toLocaleDateString() : 'Recent'}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </LayerGroup>
          </LayersControl.Overlay>
        </LayersControl>

        {/* Targeted Highlight Pin (when directed from report detail) */}
        {targetLocation && (
          <Marker
            position={[targetLocation.lat, targetLocation.lng]}
            icon={targetPinIcon}
          >
            <Popup autoClose={false}>
              <div className="min-w-[180px] p-1 text-gray-900">
                <span className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded mb-1">
                  TARGET REPORT
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