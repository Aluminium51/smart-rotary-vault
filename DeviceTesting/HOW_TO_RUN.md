# DeviceTesting — วิธี Run การทดสอบอุปกรณ์

ชุดทดสอบฮาร์ดแวร์ทีละอุปกรณ์ของ Smart Rotary & Tamper Vault ก่อนนำไปรวมเป็นเฟิร์มแวร์จริงใน `firmware/`

| โฟลเดอร์ | บอร์ด | เครื่องมือ |
|---|---|---|
| `STM32_Test_file/Test1/` | Nucleo-F411RE | STM32CubeMX + STM32CubeIDE |
| `ESP32_Test_file/uart_link_test/` | ESP32-S3 N16R8 | PlatformIO (VS Code) |
| `ESP32_Test_file/wifi_test/` | ESP32-S3 N16R8 | PlatformIO (VS Code) |

> โค้ดในโฟลเดอร์นี้ใช้ **ทดสอบฮาร์ดแวร์เท่านั้น** โปรโตคอล `PING`/`PONG` และค่าต่าง ๆ ไม่ใช่ data contract จริงของระบบ

---

## 1. สิ่งที่ต้องติดตั้ง

- **STM32CubeIDE 2.x** — build / flash / debug ฝั่ง STM32
- **STM32CubeMX** (standalone) — แก้ไฟล์ `.ioc` (CubeIDE 2.x ไม่มีตัวแก้ `.ioc` ในตัวแล้ว)
- **VS Code + ส่วนขยาย PlatformIO IDE** — ฝั่ง ESP32
- โปรแกรม Serial terminal เช่น **Tera Term** หรือ Serial Console ใน CubeIDE
- สาย USB 2 เส้น (Nucleo 1 เส้น, ESP32 1 เส้น)

### พอร์ต COM (เครื่องที่ใช้พัฒนา)

| อุปกรณ์ | พอร์ต | ชื่อใน Device Manager |
|---|---|---|
| Nucleo (ST-LINK) | COM3 | STMicroelectronics STLink Virtual COM Port |
| ESP32-S3 (พอร์ต `COM`/`UART`) | COM4 | USB-Enhanced-SERIAL CH343 |

ถ้าเครื่องอื่นได้เลขพอร์ตต่างไป ให้แก้ `upload_port` / `monitor_port` ใน `platformio.ini`

---

## 2. STM32 — `STM32_Test_file/Test1`

### 2.1 ตั้งค่า
- MCU: STM32F411RE, SYSCLK 84 MHz (HSI + PLL)
- Log ออก **USART2 → ST-LINK VCP (COM3) 115200 8N1** ผ่าน `printf`

### 2.2 เลือกการทดสอบ
แก้บรรทัดเดียวใน `Core/Src/main.c` (ในบล็อก `USER CODE BEGIN PD`):

```c
#define TEST_MODE       TEST_UART_LINK
```

| `TEST_MODE` | ทดสอบ | อุปกรณ์ที่ต้องต่อ |
|---|---|---|
| `TEST_SMOKE` | LD2 กระพริบ + log + ปุ่ม B1 | ไม่มี |
| `TEST_KY040` | Rotary encoder + ปุ่มกดแกน | KY-040 |
| `TEST_KY002` | Vibration / tamper sensor | KY-002 |
| `TEST_KY006` | Passive buzzer (กด B1 เพื่อเล่นซ้ำ) | KY-006 |
| `TEST_UART_LINK` | UART PING/PONG กับ ESP32 | ESP32-S3 |

ทดสอบ **ทีละอุปกรณ์** — ถอดอุปกรณ์อื่นออก แต่ใช้ขาเดิมตามตารางด้านล่าง

### 2.3 การต่อสาย (ถอด USB ก่อนต่อทุกครั้ง)

| อุปกรณ์ | ขาอุปกรณ์ | Nucleo | MCU pin | Peripheral |
|---|---|---|---|---|
| KY-040 | `CLK` | A0 | PA0 | TIM2_CH1 (Encoder) |
| | `DT` | A1 | PA1 | TIM2_CH2 (Encoder) |
| | `SW` | D4 | PB5 | EXTI5, Pull-up |
| | `+` | **3V3** | — | |
| | `GND` | GND | — | |
| KY-002 | `S` | D7 | PA8 | EXTI8 both edges, Pull-up |
| | ขากลาง (`+`) | **3V3** | — | |
| | `-` | GND | — | |
| KY-006 | `S` | D5 | PB4 | TIM3_CH1 PWM |
| | ขากลาง | ไม่ต่อ | — | |
| | `-` | GND | — | |
| ESP32-S3 | GPIO18 (RX) | D8 | PA9 | USART1_TX |
| | GPIO17 (TX) | D2 | PA10 | USART1_RX |
| | GND | GND | — | **ต้องต่อ GND ร่วม** |

ข้อควรระวัง
- KY-040 / KY-002 ใช้ไฟ **3V3 เท่านั้น** ห้ามต่อ 5V
- ไล่สายตาม **ตัวอักษรบนโมดูล** ไม่ใช่ลำดับขา (เคยเสียบกลับหัวมาแล้ว)
- KY-006 ต่อตรงไม่มีตัวต้านทาน → โค้ดจำกัด duty 10% และเสียงละ ≤ 300 ms ห้ามเพิ่มโดยไม่ใส่ตัวต้านทาน 100–330 Ω
- ห้ามต่อสายไฟ (3V3/5V) ระหว่าง Nucleo กับ ESP32 — แต่ละบอร์ดใช้ไฟจาก USB ของตัวเอง

### 2.4 Build / Run
1. ถ้าแก้ `.ioc`: เปิด `Test1.ioc` ใน **STM32CubeMX** → แก้ → **Ctrl+S** → **GENERATE CODE**
2. CubeIDE: คลิกขวา `Test1` → **Refresh** (F5)
3. `Project → Build Project` (Ctrl+B) → ต้องได้ `0 errors, 0 warnings`
4. `Run → Run As → STM32 C/C++ Application`
5. เปิด Serial terminal ที่ **COM3 115200** → กดปุ่ม **RESET (ดำ)** บน Nucleo

> แก้โค้ดเฉพาะระหว่าง `/* USER CODE BEGIN … */` และ `/* USER CODE END … */` เท่านั้น ไม่งั้นจะหายตอน Generate

### 2.5 ผลที่ควรเห็น

| โหมด | ผลผ่าน |
|---|---|
| `TEST_SMOKE` | `boot, SYSCLK=84000000 Hz` และ `alive #n` ทุก 500 ms, LD2 กระพริบ |
| `TEST_KY040` | หมุน 1 คลิก = 1 บรรทัด, ตามเข็ม = `UP`, ทวนเข็ม = `DOWN`, `raw` เปลี่ยนทีละ 4; กดแกน = `SW PRESSED/RELEASED` |
| `TEST_KY002` | วางนิ่ง `total_edges` ไม่เพิ่ม; สัมผัส/กระแทกตัวเซนเซอร์ = `TAMPER #n START/END` และ LD2 ติด |
| `TEST_KY006` | ได้ยิน sweep 500–4000 Hz, เสียง OK / ERROR / ALARM, บอร์ดไม่ reset เอง |
| `TEST_UART_LINK` | `#n OK "PONG n" rtt≈1.7 ms`, `stats ... bad=0`; ถอดสาย = `TIMEOUT`, เสียบกลับ = `OK` เอง |

### 2.6 แก้ปัญหา

| อาการ | สาเหตุที่พบบ่อย |
|---|---|
| Run ไม่ได้ | Build fail → ดูแท็บ Console (เคยเกิดจากตั้ง User Label ผิดขาใน CubeMX) |
| Generate แล้วโค้ดไม่เปลี่ยน | ยังไม่ได้ **Ctrl+S** ใน CubeMX / ยังไม่ Refresh ใน CubeIDE |
| KY-040 หมุนไม่ขึ้น / นับเพี้ยน | สาย Dupont หลวม หรือเสียบกลับหัว — เปิด `ENC_PIN_DIAG 1` เพื่อดูระดับ CLK/DT ตอนนิ่งต้องเป็น `CLK=1 DT=1` |
| เปิด COM3 ไม่ได้ (Access denied) | มีโปรแกรมอื่นเปิด COM3 อยู่ (Tera Term / CubeIDE / PlatformIO) ปิดก่อน |
| UART ได้ `TIMEOUT` ทั้งหมด | ESP32 ยังไม่ได้ flash `uart_link_test`, TX/RX ไม่ไขว้, หรือไม่ได้ต่อ GND |

---

## 3. ESP32-S3 — PlatformIO

ทั้งสองโปรเจกต์ใช้ `platform = espressif32@6.9.0` (**ห้ามเอาเวอร์ชันออก** — เวอร์ชันล่าสุดมี toolchain ที่แตกไฟล์ไม่ครบบน Windows เครื่องนี้ ทำให้ error `stdint.h: No such file or directory`)

เสียบ USB ที่พอร์ต **`COM` / `UART`** ของบอร์ด (ไม่ใช่พอร์ต `USB`)

### คำสั่งพื้นฐาน (รันใน **โฟลเดอร์โปรเจกต์** เสมอ)

```bat
cd C:\Year3-1\Embedded\Project\smart-rotary-vault\DeviceTesting\ESP32_Test_file\<project>
pio run                 :: build
pio run -t upload       :: build + upload
pio device monitor      :: ดู Serial (Ctrl+C เพื่อออก)
pio run -t clean        :: ลบ build เก่า
```

หรือใช้ปุ่มแถบล่างของ VS Code: ✓ Build, → Upload, 🔌 Serial Monitor

- ต้องปิด Monitor (Ctrl+C) ก่อน upload ทุกครั้ง
- ถ้าค้างที่ `Connecting...` → กด **BOOT** ค้าง → กด **RST** → ปล่อย BOOT
- ถ้า Monitor เงียบ → กด **RST** บนบอร์ด

### 3.1 `uart_link_test`
ตอบ `PONG n` ทุกครั้งที่ได้ `PING n` จาก STM32 ทาง UART1 (TX=GPIO17, RX=GPIO18, 115200)

1. Upload โปรเจกต์นี้ลง ESP32
2. STM32 ตั้ง `TEST_MODE TEST_UART_LINK` แล้ว Run
3. ต่อสาย 3 เส้นตามตาราง 2.3
4. ดู COM3 (STM32) และ `pio device monitor` (ESP32) พร้อมกัน

ผลผ่าน: ESP32 ขึ้น `rx "PING n" -> tx "PONG n"`, STM32 ขึ้น `OK`

### 3.2 `wifi_test`
- **W1** เชื่อม Wi-Fi, แสดง IP / RSSI, ต่อใหม่เองเมื่อ AP หลุด
- **W2** sync เวลา NTP → DNS → TLS ตรวจ certificate จริง → `GET` แบบอ่านอย่างเดียว ไม่ยืนยันตัวตน ไปที่ Firebase Realtime Database (**ไม่มีการเขียนข้อมูล**)

ตั้งค่าครั้งแรก
1. copy `include/secrets.example.h` → `include/secrets.h`
2. ใส่ค่า

   | ค่า | ใส่อะไร |
   |---|---|
   | `WIFI_SSID` / `WIFI_PASSWORD` | Wi-Fi **2.4 GHz** แบบ WPA2/WPA3-Personal (แนะนำ hotspot มือถือ) |
   | `FIREBASE_DB_HOST` | host ของ RTDB ไม่ต้องมี `https://` เช่น `xxx-default-rtdb.asia-southeast1.firebasedatabase.app` — ว่าง `""` = ทดสอบแค่ W1 |

3. `pio run -t upload` → `pio device monitor`

> `secrets.h` ถูก `.gitignore` ไว้แล้ว **ห้าม commit / ห้ามส่งรหัสให้คนอื่น**
> ESP32-S3 ใช้ **5 GHz ไม่ได้** และใช้ Wi-Fi ที่ต้อง login ผ่านหน้าเว็บ / username (Wi-Fi มหาวิทยาลัย) ไม่ได้

ผลผ่าน
```
[WIFI]   * "<SSID>" ch=6 rssi=-50 dBm          ← เครือข่ายที่ตั้งไว้มองเห็น
[WIFI] GOT IP 192.168.x.x ...
[TLS] handshake OK, certificate verified
[TLS] PASS: ... unauthenticated read denied (expected)    ← HTTP 401 = ผ่าน
```
ทดสอบ reconnect: ปิด hotspot 20 วินาที → เปิดใหม่ → ต้องกลับมา `GOT IP` และ `[TLS] PASS` เอง

| ข้อความ | ความหมาย |
|---|---|
| `reason 201 NO_AP_FOUND` / `NOT visible` | SSID เป็น 5 GHz, พิมพ์ผิด หรืออยู่ไกลเกิน |
| `reason 15 4WAY_HANDSHAKE_TIMEOUT` | รหัส Wi-Fi ผิด |
| `[TLS] FAIL: NTP` | Wi-Fi ไม่มีอินเทอร์เน็ต หรือบล็อก NTP |
| `[TLS] FAIL: handshake/verify` | certificate ไม่ผ่าน / เครือข่ายดักจับ HTTPS |
| `[TLS] FAIL: 404` | `FIREBASE_DB_HOST` ผิด |
| `WARNING: database root is publicly readable` | Security Rules เปิดให้อ่านโดยไม่ยืนยันตัวตน — ต้องแก้ |

---

## 4. สถานะการทดสอบ

| การทดสอบ | สถานะ |
|---|---|
| Smoke (USART2 / LD2 / B1) | ✅ ผ่าน |
| KY-040 encoder + SW | ✅ ผ่าน |
| KY-002 tamper | ✅ ผ่าน |
| KY-006 buzzer | ✅ ผ่าน |
| UART STM32 ↔ ESP32 | ✅ ผ่าน |
| ESP32 Wi-Fi (W1) | 🟡 กำลังทดสอบ |
| ESP32 HTTPS/TLS → Firebase (W2) | 🟡 รอ host ของ Firebase |
| KY-019 relay | ⏸ รอทีมยืนยันการใช้งาน |
| อ่าน/เขียน Firebase แบบยืนยันตัวตน | ⏸ รอกำหนด auth + schema (`docs/ARCHITECTURE.md`) |
