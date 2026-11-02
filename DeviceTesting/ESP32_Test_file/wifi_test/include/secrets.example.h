// Copy this file to secrets.h (same folder) and fill in your values.
// secrets.h is git-ignored; never commit real credentials.
#pragma once

// 2.4 GHz WPA2/WPA3-Personal network (e.g. a phone hotspot).
#define WIFI_SSID "your-ssid"
#define WIFI_PASSWORD "your-password"

// Firebase Realtime Database host name only: no "https://", no path.
// e.g. "my-project-default-rtdb.asia-southeast1.firebasedatabase.app"
// Leave empty ("") to skip the HTTPS/TLS check and test Wi-Fi only.
#define FIREBASE_DB_HOST ""
