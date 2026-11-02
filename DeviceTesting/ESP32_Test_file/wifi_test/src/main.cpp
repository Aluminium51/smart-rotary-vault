// Wi-Fi + HTTPS/TLS reachability test (test-only; no Firebase writes).
// W1: join Wi-Fi, log IP/RSSI, recover after the AP disappears.
// W2: NTP time sync, DNS lookup, certificate-verified TLS to the Firebase RTDB
//     host, then an unauthenticated read-only GET. A 401 "Permission denied"
//     is the expected pass result: it proves DNS + TLS + HTTP all work.

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <time.h>

#if __has_include("secrets.h")
#include "secrets.h"
#else
#error "Copy include/secrets.example.h to include/secrets.h and fill in your values"
#endif
#include "root_ca.h"

static constexpr uint32_t kStatusPeriodMs = 5000;
static constexpr uint32_t kReconnectAfterMs = 15000;   // retry if still down this long
static constexpr uint32_t kTlsCheckPeriodMs = 60000;   // repeat W2 while connected
static constexpr uint32_t kNtpTimeoutMs = 10000;
static constexpr uint32_t kHttpResponseTimeoutMs = 5000;
static constexpr time_t kValidEpochAfter = 1700000000;  // 2023-11; earlier = clock not set

// Set from the Wi-Fi event task, consumed in loop().
static volatile bool gotIpEvent = false;
static volatile uint32_t disconnectCount = 0;
static volatile uint8_t lastDisconnectReason = 0;

static uint32_t connectStartMs = 0;
static uint32_t connectedSinceMs = 0;
static uint32_t lastStatusMs = 0;
static uint32_t lastTlsCheckMs = 0;
static uint32_t lastBeginMs = 0;
static uint32_t tlsPass = 0;
static uint32_t tlsFail = 0;

static const char *reasonText(uint8_t reason) {
  switch (reason) {
    case WIFI_REASON_AUTH_EXPIRE: return "AUTH_EXPIRE";
    case WIFI_REASON_ASSOC_LEAVE: return "ASSOC_LEAVE";
    case WIFI_REASON_4WAY_HANDSHAKE_TIMEOUT: return "4WAY_HANDSHAKE_TIMEOUT (wrong password?)";
    case WIFI_REASON_BEACON_TIMEOUT: return "BEACON_TIMEOUT (AP gone)";
    case WIFI_REASON_NO_AP_FOUND: return "NO_AP_FOUND (SSID not visible / 5 GHz only?)";
    case WIFI_REASON_AUTH_FAIL: return "AUTH_FAIL";
    case WIFI_REASON_ASSOC_FAIL: return "ASSOC_FAIL";
    case WIFI_REASON_HANDSHAKE_TIMEOUT: return "HANDSHAKE_TIMEOUT";
    default: return "other";
  }
}

static void onWiFiEvent(WiFiEvent_t event, WiFiEventInfo_t info) {
  switch (event) {
    case ARDUINO_EVENT_WIFI_STA_CONNECTED:
      Serial.printf("[WIFI] associated with AP, channel %u\n", info.wifi_sta_connected.channel);
      break;
    case ARDUINO_EVENT_WIFI_STA_GOT_IP:
      gotIpEvent = true;
      break;
    case ARDUINO_EVENT_WIFI_STA_DISCONNECTED:
      disconnectCount++;
      lastDisconnectReason = info.wifi_sta_disconnected.reason;
      Serial.printf("[WIFI] disconnected, reason %u %s\n", lastDisconnectReason,
                    reasonText(lastDisconnectReason));
      break;
    default:
      break;
  }
}

// ESP32-S3 radios are 2.4 GHz only: list what is actually visible so a
// 5 GHz-only or misspelled SSID is obvious.
static void scanNetworks() {
  int n = WiFi.scanNetworks();
  bool found = false;
  Serial.printf("[WIFI] scan: %d network(s) visible on 2.4 GHz\n", n);
  for (int i = 0; i < n && i < 15; i++) {
    bool match = (WiFi.SSID(i) == WIFI_SSID);
    found = found || match;
    Serial.printf("[WIFI]   %s\"%s\" ch=%d rssi=%d dBm\n", match ? "* " : "  ",
                  WiFi.SSID(i).c_str(), WiFi.channel(i), WiFi.RSSI(i));
  }
  if (!found) {
    Serial.printf("[WIFI] configured SSID \"%s\" NOT visible - 5 GHz only, out of range, or misspelled\n",
                  WIFI_SSID);
  }
  WiFi.scanDelete();
}

static void beginWiFi() {
  lastBeginMs = millis();
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
}

static bool syncTime() {
  configTime(0, 0, "pool.ntp.org", "time.google.com");
  uint32_t start = millis();
  while (time(nullptr) < kValidEpochAfter) {
    if (millis() - start > kNtpTimeoutMs) {
      return false;
    }
    delay(100);
  }
  return true;
}

// Returns true when the full DNS -> TLS (verified) -> HTTP chain works.
static bool runTlsCheck() {
  const char *host = FIREBASE_DB_HOST;
  if (host[0] == '\0') {
    Serial.println("[TLS] FIREBASE_DB_HOST empty in secrets.h, skipping W2");
    return true;
  }

  if (time(nullptr) < kValidEpochAfter && !syncTime()) {
    Serial.println("[TLS] FAIL: NTP time sync timed out (certificate dates cannot be checked)");
    return false;
  }
  time_t now = time(nullptr);
  struct tm utc;
  gmtime_r(&now, &utc);
  Serial.printf("[TLS] UTC time %04d-%02d-%02d %02d:%02d:%02d\n", utc.tm_year + 1900,
                utc.tm_mon + 1, utc.tm_mday, utc.tm_hour, utc.tm_min, utc.tm_sec);

  IPAddress ip;
  uint32_t t0 = millis();
  if (WiFi.hostByName(host, ip) != 1) {
    Serial.printf("[TLS] FAIL: DNS lookup for %s\n", host);
    return false;
  }
  Serial.printf("[TLS] DNS %s -> %s (%lu ms)\n", host, ip.toString().c_str(),
                (unsigned long)(millis() - t0));

  WiFiClientSecure client;
  client.setCACert(kGoogleRootCAs);
  client.setHandshakeTimeout(15);

  t0 = millis();
  if (!client.connect(host, 443)) {
    char err[96] = {0};
    int code = client.lastError(err, sizeof(err));
    Serial.printf("[TLS] FAIL: handshake/verify error %d: %s\n", code, err);
    return false;
  }
  Serial.printf("[TLS] handshake OK, certificate verified (%lu ms)\n",
                (unsigned long)(millis() - t0));

  // Unauthenticated, read-only, shallow GET of the root.
  client.printf("GET /.json?shallow=true HTTP/1.1\r\nHost: %s\r\n"
                "User-Agent: vault-devtest\r\nConnection: close\r\n\r\n", host);

  t0 = millis();
  while (client.connected() && client.available() == 0) {
    if (millis() - t0 > kHttpResponseTimeoutMs) {
      Serial.println("[TLS] FAIL: no HTTP response");
      client.stop();
      return false;
    }
    delay(10);
  }
  String statusLine = client.readStringUntil('\n');
  statusLine.trim();
  client.stop();
  Serial.printf("[TLS] HTTP \"%s\" (%lu ms)\n", statusLine.c_str(),
                (unsigned long)(millis() - t0));

  if (statusLine.indexOf(" 401") > 0) {
    Serial.println("[TLS] PASS: reached Firebase over verified TLS; unauthenticated read denied (expected)");
    return true;
  }
  if (statusLine.indexOf(" 200") > 0) {
    Serial.println("[TLS] PASS (transport) / WARNING: database root is publicly readable - check Security Rules");
    return true;
  }
  if (statusLine.indexOf(" 404") > 0) {
    Serial.println("[TLS] FAIL: 404 - database host name probably wrong");
    return false;
  }
  Serial.println("[TLS] FAIL: unexpected HTTP status");
  return false;
}

static void printStatus() {
  if (WiFi.status() == WL_CONNECTED) {
    Serial.printf("[WIFI] status UP ip=%s rssi=%d dBm up=%lus disconnects=%lu tls pass/fail=%lu/%lu heap=%u\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI(),
                  (unsigned long)((millis() - connectedSinceMs) / 1000),
                  (unsigned long)disconnectCount, (unsigned long)tlsPass,
                  (unsigned long)tlsFail, (unsigned)ESP.getFreeHeap());
  } else {
    Serial.printf("[WIFI] status DOWN (wl_status=%d) disconnects=%lu last_reason=%u %s\n",
                  (int)WiFi.status(), (unsigned long)disconnectCount, lastDisconnectReason,
                  reasonText(lastDisconnectReason));
  }
}

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.printf("\n[WIFI] wifi_test ready, SSID \"%s\", Firebase host \"%s\"\n", WIFI_SSID,
                FIREBASE_DB_HOST);

  WiFi.mode(WIFI_STA);
  WiFi.setAutoReconnect(true);
  WiFi.onEvent(onWiFiEvent);
  scanNetworks();
  connectStartMs = millis();
  beginWiFi();
}

void loop() {
  uint32_t now = millis();

  if (gotIpEvent) {
    gotIpEvent = false;
    connectedSinceMs = now;
    Serial.printf("[WIFI] GOT IP %s rssi=%d dBm, took %lu ms\n",
                  WiFi.localIP().toString().c_str(), WiFi.RSSI(),
                  (unsigned long)(now - connectStartMs));
    lastTlsCheckMs = now - kTlsCheckPeriodMs;  // run W2 right away after (re)connect
  }

  if (WiFi.status() == WL_CONNECTED) {
    if (now - lastTlsCheckMs >= kTlsCheckPeriodMs) {
      lastTlsCheckMs = now;
      if (runTlsCheck()) {
        tlsPass++;
      } else {
        tlsFail++;
      }
    }
  } else {
    if (connectedSinceMs != 0) {
      // Link just dropped: time the recovery from here.
      connectedSinceMs = 0;
      connectStartMs = now;
    }
    if (now - lastBeginMs >= kReconnectAfterMs) {
      Serial.println("[WIFI] still down, retrying WiFi.begin()");
      WiFi.disconnect();
      beginWiFi();
    }
  }

  if (now - lastStatusMs >= kStatusPeriodMs) {
    lastStatusMs = now;
    printStatus();
  }
  delay(10);
}
