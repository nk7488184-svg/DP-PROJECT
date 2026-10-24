import sqlite3
import os

gis_dir = r"C:\Users\nk748\OneDrive\Desktop\DP\GIS NORTH"
for f in os.listdir(gis_dir):
    if f.endswith('.gpkg'):
        p = os.path.join(gis_dir, f)
        try:
            conn = sqlite3.connect(p)
            c = conn.cursor()
            c.execute("SELECT table_name, data_type, srs_id FROM gpkg_contents")
            rows = c.fetchall()
            print(f"=== {f} ===")
            for r in rows:
                print("  Table:", r)
                # also check SRS
                c.execute(f"SELECT srs_name, srs_id, organization, organization_coordsys_id, definition FROM gpkg_spatial_ref_sys WHERE srs_id = {r[2]}")
                srs = c.fetchone()
                print("    SRS:", srs[0] if srs else "unknown", srs[3] if srs else "")
            conn.close()
        except Exception as e:
            print(f"Error {f}: {e}")
