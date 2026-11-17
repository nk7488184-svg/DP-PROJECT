#!/usr/bin/env python3
"""
RoadSentinel - Google Drive Sync Utility
Target Account: neerajjeeadv2025@gmail.com
"""
import os
import sys
import glob
from datetime import datetime, timezone

TARGET_GMAIL = "neerajjeeadv2025@gmail.com"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CSV_PATH = os.path.join(BASE_DIR, "storage", "cloud_backup", "roadsentinel_violations_neerajjeeadv2025.csv")
STAGING_DIR = os.path.join(BASE_DIR, "storage", "google_drive_sync")

def print_status():
    print("=" * 70)
    print(" RoadSentinel Cloud Backup & Google Drive Sync")
    print("=" * 70)
    print(f" Target User / Owner : {TARGET_GMAIL}")
    print(f" Master CSV Ledger   : {CSV_PATH}")
    print(f" Local Staged Images : {STAGING_DIR}")

    if os.path.exists(CSV_PATH):
        with open(CSV_PATH, "r", encoding="utf-8") as f:
            lines = [line.strip() for line in f if line.strip()]
            print(f" Recorded Violations : {max(0, len(lines) - 1)} events")
    else:
        print(" Recorded Violations : 0 events (Ledger initialized)")

    imgs = glob.glob(os.path.join(STAGING_DIR, "*.*"))
    print(f" Staged ALPR Photos  : {len(imgs)} images ready for Google Drive")
    print("=" * 70)

if __name__ == "__main__":
    print_status()
