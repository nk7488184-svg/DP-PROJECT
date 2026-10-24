import json
import os

src_dir = r"c:\Users\nk748\OneDrive\Desktop\Backend\public\gis"

# Categorize and merge layers
categories = {
    "roads": [
        "north-campus__north_campus_roads.geojson",
        "roads__south_campus_roads.geojson",
        "roads__south_roads.geojson",
        "north_south_road__n.geojson",
        "southcampus__south_roads.geojson"
    ],
    "pedestrian_paths": [
        "north-campus__north_campus_pedestrian_paths.geojson",
        "south_pedestrian_paths__south_pedestrian_paths.geojson"
    ],
    "buildings": [
        "north-campus__north_campus_buildings.geojson",
        "south_campus_buildings__south_buildings.geojson"
    ],
    "grounds": [
        "grounds__south_campus_grounds.geojson"
    ],
    "boundaries": [
        "north-campus__north_campus_boundary.geojson",
        "south_boundary__south_modified.geojson"
    ]
}

merged = {}
for cat, files in categories.items():
    merged_features = []
    for f in files:
        p = os.path.join(src_dir, f)
        if os.path.exists(p):
            with open(p, "r", encoding="utf-8") as inf:
                data = json.load(inf)
                for feat in data.get("features", []):
                    feat["properties"]["_layer_category"] = cat
                    feat["properties"]["_source_file"] = f
                    merged_features.append(feat)
    merged[cat] = {
        "type": "FeatureCollection",
        "name": cat,
        "features": merged_features
    }
    print(f"Category {cat}: {len(merged_features)} features")

# Write out merged GIS files
for cat, data in merged.items():
    with open(os.path.join(src_dir, f"campus_{cat}.geojson"), "w", encoding="utf-8") as out:
        json.dump(data, out)

with open(os.path.join(src_dir, "campus_all_gis.json"), "w", encoding="utf-8") as out:
    json.dump(merged, out)

# Also copy to frontend public folders so they can load directly if needed
dash_public = r"c:\Users\nk748\OneDrive\Desktop\ROAD-SENTINEL\campus-safety-dashboard\public\gis"
web_public = r"c:\Users\nk748\OneDrive\Desktop\ROAD-SENTINEL\campus-safety-website\public\gis"

for target_dir in [dash_public, web_public]:
    os.makedirs(target_dir, exist_ok=True)
    with open(os.path.join(target_dir, "campus_all_gis.json"), "w", encoding="utf-8") as out:
        json.dump(merged, out)
    for cat, data in merged.items():
        with open(os.path.join(target_dir, f"campus_{cat}.geojson"), "w", encoding="utf-8") as out:
            json.dump(data, out)

print("Merged GIS files written and copied to both frontends!")
