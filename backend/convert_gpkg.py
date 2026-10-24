import sqlite3
import os
import json
import struct
from pyproj import Transformer
from shapely import wkb
from shapely.geometry import mapping
from shapely.ops import transform

gis_dir = r"C:\Users\nk748\OneDrive\Desktop\DP\GIS NORTH"

# Transformer from UTM 43N (EPSG:32643) to WGS84 (EPSG:4326)
# always_xy=True ensures (x=easting, y=northing) -> (lon, lat)
transformer = Transformer.from_crs("EPSG:32643", "EPSG:4326", always_xy=True)

def project_geom(geom):
    return transform(transformer.transform, geom)

def parse_gpkg_geom(blob):
    """
    GeoPackage binary geometry header is at least 8 bytes:
    Magic: 0x47, 0x50 ('GP')
    Version: byte (0)
    Flags: byte
    SRS ID: 4 bytes
    Envelope: variable length depending on flags (0, 32, 48, 64 bytes)
    Followed by standard WKB!
    """
    if blob is None or len(blob) < 8:
        return None
    magic = blob[0:2]
    if magic != b'GP':
        return None
    flags = blob[3]
    envelope_indicator = (flags >> 1) & 0x07
    envelope_lens = {0: 0, 1: 32, 2: 48, 3: 48, 4: 64}
    env_len = envelope_lens.get(envelope_indicator, 0)
    wkb_data = blob[8 + env_len:]
    try:
        return wkb.loads(wkb_data)
    except Exception as e:
        print("WKB load error:", e)
        return None

# Process each gpkg and export to geojson
all_layers = {}

for f in sorted(os.listdir(gis_dir)):
    if not f.endswith('.gpkg'):
        continue
    p = os.path.join(gis_dir, f)
    conn = sqlite3.connect(p)
    c = conn.cursor()
    c.execute("SELECT table_name, data_type, srs_id FROM gpkg_contents WHERE data_type='features'")
    tables = c.fetchall()
    for tbl, dtype, srs_id in tables:
        # get columns
        c.execute(f"PRAGMA table_info({tbl})")
        cols = [row[1] for row in c.fetchall()]
        geom_col = 'geom' if 'geom' in cols else ('geometry' if 'geometry' in cols else cols[1])
        
        c.execute(f"SELECT * FROM {tbl}")
        rows = c.fetchall()
        features = []
        for r in rows:
            row_dict = dict(zip(cols, r))
            geom_blob = row_dict.pop(geom_col, None)
            geom = parse_gpkg_geom(geom_blob)
            if geom:
                # project from EPSG:32643 to EPSG:4326 (lat/lon)
                wgs84_geom = project_geom(geom)
                geojson_geom = mapping(wgs84_geom)
                
                # clean up non-serializable properties
                props = {}
                for k, v in row_dict.items():
                    if isinstance(v, (int, float, str, bool)) or v is None:
                        props[k] = v
                    else:
                        props[k] = str(v)
                
                features.append({
                    "type": "Feature",
                    "geometry": geojson_geom,
                    "properties": props
                })
        
        geojson = {
            "type": "FeatureCollection",
            "name": tbl,
            "crs": { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
            "features": features
        }
        layer_key = f"{os.path.splitext(f)[0]}__{tbl}"
        all_layers[layer_key] = geojson
        print(f"Layer {layer_key}: {len(features)} features")
    conn.close()

# Save combined layers and individual layers
out_dir = r"c:\Users\nk748\OneDrive\Desktop\Backend\public\gis"
os.makedirs(out_dir, exist_ok=True)

for name, gj in all_layers.items():
    with open(os.path.join(out_dir, f"{name}.geojson"), "w", encoding="utf-8") as out:
        json.dump(gj, out)

with open(os.path.join(out_dir, "campus_gis_layers.json"), "w", encoding="utf-8") as out:
    json.dump(all_layers, out)

print("Export complete! Files saved in", out_dir)
