// UART link test (test-only protocol, not the vault data contract).
// STM32 USART1 sends "PING <n>\n"; this replies "PONG <n>\n" on UART1
// and logs everything to the USB serial monitor.

#include <Arduino.h>

// UART1 pins wired to the Nucleo: GPIO17 -> PA10 (STM32 RX), GPIO18 <- PA9 (STM32 TX).
static constexpr int kLinkTxPin = 17;
static constexpr int kLinkRxPin = 18;
static constexpr uint32_t kLinkBaud = 115200;
static constexpr size_t kMaxLineLen = 64;
static constexpr uint32_t kStatusPeriodMs = 5000;

static HardwareSerial Link(1);

static char lineBuf[kMaxLineLen + 1];
static size_t lineLen = 0;
static bool lineOverflow = false;

static uint32_t pingCount = 0;
static uint32_t badCount = 0;
static uint32_t overflowCount = 0;
static uint32_t lastStatusMs = 0;

static void handleLine(const char *line) {
  if (strncmp(line, "PING ", 5) == 0) {
    pingCount++;
    Link.printf("PONG %s\n", line + 5);
    Serial.printf("[ESP] rx \"%s\" -> tx \"PONG %s\"\n", line, line + 5);
  } else {
    badCount++;
    Serial.printf("[ESP] unexpected line: \"%s\"\n", line);
  }
}

void setup() {
  Serial.begin(115200);
  Link.begin(kLinkBaud, SERIAL_8N1, kLinkRxPin, kLinkTxPin);
  delay(200);
  Serial.printf("\n[ESP] uart_link_test ready: UART1 TX=GPIO%d RX=GPIO%d @%lu\n",
                kLinkTxPin, kLinkRxPin, (unsigned long)kLinkBaud);
}

void loop() {
  while (Link.available() > 0) {
    char c = (char)Link.read();
    if (c == '\r') {
      continue;
    }
    if (c == '\n') {
      if (lineOverflow) {
        overflowCount++;
        Serial.println("[ESP] line too long, dropped");
      } else {
        lineBuf[lineLen] = '\0';
        handleLine(lineBuf);
      }
      lineLen = 0;
      lineOverflow = false;
    } else if (lineLen < kMaxLineLen) {
      lineBuf[lineLen++] = c;
    } else {
      lineOverflow = true;
    }
  }

  uint32_t now = millis();
  if (now - lastStatusMs >= kStatusPeriodMs) {
    lastStatusMs = now;
    Serial.printf("[ESP] status pings=%lu bad=%lu overflow=%lu\n",
                  (unsigned long)pingCount, (unsigned long)badCount,
                  (unsigned long)overflowCount);
  }
}
