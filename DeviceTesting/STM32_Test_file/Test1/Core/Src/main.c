/* USER CODE BEGIN Header */
/**
  ******************************************************************************
  * @file           : main.c
  * @brief          : Main program body
  ******************************************************************************
  * @attention
  *
  * Copyright (c) 2026 STMicroelectronics.
  * All rights reserved.
  *
  * This software is licensed under terms that can be found in the LICENSE file
  * in the root directory of this software component.
  * If no LICENSE file comes with this software, it is provided AS-IS.
  *
  ******************************************************************************
  */
/* USER CODE END Header */
/* Includes ------------------------------------------------------------------*/
#include "main.h"

/* Private includes ----------------------------------------------------------*/
/* USER CODE BEGIN Includes */
#include <stdio.h>
#include <string.h>
/* USER CODE END Includes */

/* Private typedef -----------------------------------------------------------*/
/* USER CODE BEGIN PTD */

/* USER CODE END PTD */

/* Private define ------------------------------------------------------------*/
/* USER CODE BEGIN PD */
/* Select which device test runs. Add one mode per device as it is brought up. */
#define TEST_SMOKE      0   /* LD2 blink + USART2 log + B1 poll */
#define TEST_KY040      1   /* TIM2 encoder (PA0/PA1) + push switch (PB5) */
#define TEST_KY002      2   /* Vibration/tamper switch on PA8 (EXTI both edges) */
#define TEST_KY006      3   /* Passive buzzer on PB4 (TIM3_CH1 PWM) */
#define TEST_UART_LINK  4   /* USART1 PA9/PA10 <-> ESP32-S3 PING/PONG */
#define TEST_MODE       TEST_UART_LINK

#define SMOKE_PERIOD_MS 500U

/* KY-040: 4 quadrature edges per detent in TI1+TI2 (x4) mode. */
#define ENC_COUNTS_PER_DETENT 4
#define ENC_SW_DEBOUNCE_MS    20U
/* 1 = also log raw CLK/DT pin levels on every change (wiring diagnostic). */
#define ENC_PIN_DIAG          0

/* KY-002: a shake produces a burst of edges; the event ends after this
 * much silence. Status line is printed periodically to show the idle level. */
#define TAMPER_QUIET_MS       200U
#define TAMPER_STATUS_MS      5000U

/* KY-006 is driven straight from PB4 with no series resistor, so keep duty
 * low (limits average pin current) and every beep short. TIM3 tick = 1 MHz
 * (PSC=83 in .ioc); frequency is set by changing ARR at runtime. */
#define BUZZER_TICK_HZ        1000000U
#define BUZZER_DUTY_PERCENT   10U
#define BUZZER_MIN_HZ         100U
#define BUZZER_MAX_HZ         10000U
#define BUZZER_MAX_BEEP_MS    300U

/* UART link test (test-only line protocol, not the vault data contract).
 * RX is polled right after each PING, before any USART2 logging, so no
 * USART1 interrupt is needed for this test. */
#define LINK_PING_PERIOD_MS   1000U
#define LINK_REPLY_TIMEOUT_MS 100U
#define LINK_LINE_MAX         32U
#define LINK_STATS_EVERY      10U
/* USER CODE END PD */

/* Private macro -------------------------------------------------------------*/
/* USER CODE BEGIN PM */

/* USER CODE END PM */

/* Private variables ---------------------------------------------------------*/
TIM_HandleTypeDef htim2;
TIM_HandleTypeDef htim3;

UART_HandleTypeDef huart1;
UART_HandleTypeDef huart2;

/* USER CODE BEGIN PV */
/* Incremented in EXTI ISR; only used to confirm the PB5 interrupt fires. */
static volatile uint32_t enc_sw_irq_count = 0U;
/* Written in EXTI ISR, read in KY002_Test_Loop (32-bit reads are atomic). */
static volatile uint32_t tamper_edge_count = 0U;
static volatile uint32_t tamper_last_edge_tick = 0U;
/* USER CODE END PV */

/* Private function prototypes -----------------------------------------------*/
void SystemClock_Config(void);
static void MX_GPIO_Init(void);
static void MX_USART2_UART_Init(void);
static void MX_TIM2_Init(void);
static void MX_TIM3_Init(void);
static void MX_USART1_UART_Init(void);
/* USER CODE BEGIN PFP */
/* Only one test loop is compiled in per TEST_MODE; silence the others. */
static void Smoke_Test_Loop(void) __attribute__((unused));
static void KY040_Test_Loop(void) __attribute__((unused));
static void KY002_Test_Loop(void) __attribute__((unused));
static void KY006_Test_Loop(void) __attribute__((unused));
static void Buzzer_Off(void) __attribute__((unused));
static void Buzzer_Beep(uint32_t freq_hz, uint32_t duration_ms) __attribute__((unused));
static void UartLink_Test_Loop(void) __attribute__((unused));
/* USER CODE END PFP */

/* Private user code ---------------------------------------------------------*/
/* USER CODE BEGIN 0 */
/* Route printf() to USART2 (ST-LINK virtual COM port). */
int __io_putchar(int ch)
{
  uint8_t c = (uint8_t)ch;
  HAL_UART_Transmit(&huart2, &c, 1U, HAL_MAX_DELAY);
  return ch;
}
/* USER CODE END 0 */

/**
  * @brief  The application entry point.
  * @retval int
  */
int main(void)
{

  /* USER CODE BEGIN 1 */

  /* USER CODE END 1 */

  /* MCU Configuration--------------------------------------------------------*/

  /* Reset of all peripherals, Initializes the Flash interface and the Systick. */
  HAL_Init();

  /* USER CODE BEGIN Init */

  /* USER CODE END Init */

  /* Configure the system clock */
  SystemClock_Config();

  /* USER CODE BEGIN SysInit */

  /* USER CODE END SysInit */

  /* Initialize all configured peripherals */
  MX_GPIO_Init();
  MX_USART2_UART_Init();
  MX_TIM2_Init();
  MX_TIM3_Init();
  MX_USART1_UART_Init();
  /* USER CODE BEGIN 2 */
  setvbuf(stdout, NULL, _IONBF, 0);
  printf("\r\n[DevTest] boot, SYSCLK=%lu Hz, TEST_MODE=%d\r\n",
         HAL_RCC_GetSysClockFreq(), TEST_MODE);
#if TEST_MODE == TEST_KY040
  if (HAL_TIM_Encoder_Start(&htim2, TIM_CHANNEL_ALL) != HAL_OK)
  {
    Error_Handler();
  }
  printf("[KY040] ready: rotate knob / press shaft\r\n");
#elif TEST_MODE == TEST_KY002
  printf("[KY002] ready: idle level=%d, tap/shake the sensor\r\n",
         (HAL_GPIO_ReadPin(TAMPER_GPIO_Port, TAMPER_Pin) == GPIO_PIN_SET) ? 1 : 0);
#elif TEST_MODE == TEST_KY006
  /* Start PWM silent (CCR=0); Buzzer_Beep() sets ARR/CCR per tone. */
  Buzzer_Off();
  if (HAL_TIM_PWM_Start(&htim3, TIM_CHANNEL_1) != HAL_OK)
  {
    Error_Handler();
  }
  printf("[KY006] ready: duty=%u%%, press B1 (blue) to replay the sequence\r\n",
         BUZZER_DUTY_PERCENT);
#elif TEST_MODE == TEST_UART_LINK
  /* DWT cycle counter gives microsecond round-trip timing. */
  CoreDebug->DEMCR |= CoreDebug_DEMCR_TRCENA_Msk;
  DWT->CYCCNT = 0U;
  DWT->CTRL |= DWT_CTRL_CYCCNTENA_Msk;
  printf("[LINK] ready: USART1 %lu baud, PING every %u ms\r\n",
         huart1.Init.BaudRate, LINK_PING_PERIOD_MS);
#endif
  /* USER CODE END 2 */

  /* Infinite loop */
  /* USER CODE BEGIN WHILE */
  while (1)
  {
    /* USER CODE END WHILE */

    /* USER CODE BEGIN 3 */
#if TEST_MODE == TEST_SMOKE
    Smoke_Test_Loop();
#elif TEST_MODE == TEST_KY040
    KY040_Test_Loop();
#elif TEST_MODE == TEST_KY002
    KY002_Test_Loop();
#elif TEST_MODE == TEST_KY006
    KY006_Test_Loop();
#elif TEST_MODE == TEST_UART_LINK
    UartLink_Test_Loop();
#endif
  }
  /* USER CODE END 3 */
}

/**
  * @brief System Clock Configuration
  * @retval None
  */
void SystemClock_Config(void)
{
  RCC_OscInitTypeDef RCC_OscInitStruct = {0};
  RCC_ClkInitTypeDef RCC_ClkInitStruct = {0};

  /** Configure the main internal regulator output voltage
  */
  __HAL_RCC_PWR_CLK_ENABLE();
  __HAL_PWR_VOLTAGESCALING_CONFIG(PWR_REGULATOR_VOLTAGE_SCALE1);

  /** Initializes the RCC Oscillators according to the specified parameters
  * in the RCC_OscInitTypeDef structure.
  */
  RCC_OscInitStruct.OscillatorType = RCC_OSCILLATORTYPE_HSI;
  RCC_OscInitStruct.HSIState = RCC_HSI_ON;
  RCC_OscInitStruct.HSICalibrationValue = RCC_HSICALIBRATION_DEFAULT;
  RCC_OscInitStruct.PLL.PLLState = RCC_PLL_ON;
  RCC_OscInitStruct.PLL.PLLSource = RCC_PLLSOURCE_HSI;
  RCC_OscInitStruct.PLL.PLLM = 16;
  RCC_OscInitStruct.PLL.PLLN = 336;
  RCC_OscInitStruct.PLL.PLLP = RCC_PLLP_DIV4;
  RCC_OscInitStruct.PLL.PLLQ = 4;
  if (HAL_RCC_OscConfig(&RCC_OscInitStruct) != HAL_OK)
  {
    Error_Handler();
  }

  /** Initializes the CPU, AHB and APB buses clocks
  */
  RCC_ClkInitStruct.ClockType = RCC_CLOCKTYPE_HCLK|RCC_CLOCKTYPE_SYSCLK
                              |RCC_CLOCKTYPE_PCLK1|RCC_CLOCKTYPE_PCLK2;
  RCC_ClkInitStruct.SYSCLKSource = RCC_SYSCLKSOURCE_PLLCLK;
  RCC_ClkInitStruct.AHBCLKDivider = RCC_SYSCLK_DIV1;
  RCC_ClkInitStruct.APB1CLKDivider = RCC_HCLK_DIV2;
  RCC_ClkInitStruct.APB2CLKDivider = RCC_HCLK_DIV1;

  if (HAL_RCC_ClockConfig(&RCC_ClkInitStruct, FLASH_LATENCY_2) != HAL_OK)
  {
    Error_Handler();
  }
}

/**
  * @brief TIM2 Initialization Function
  * @param None
  * @retval None
  */
static void MX_TIM2_Init(void)
{

  /* USER CODE BEGIN TIM2_Init 0 */

  /* USER CODE END TIM2_Init 0 */

  TIM_Encoder_InitTypeDef sConfig = {0};
  TIM_MasterConfigTypeDef sMasterConfig = {0};

  /* USER CODE BEGIN TIM2_Init 1 */

  /* USER CODE END TIM2_Init 1 */
  htim2.Instance = TIM2;
  htim2.Init.Prescaler = 0;
  htim2.Init.CounterMode = TIM_COUNTERMODE_UP;
  htim2.Init.Period = 65535;
  htim2.Init.ClockDivision = TIM_CLOCKDIVISION_DIV1;
  htim2.Init.AutoReloadPreload = TIM_AUTORELOAD_PRELOAD_DISABLE;
  sConfig.EncoderMode = TIM_ENCODERMODE_TI12;
  sConfig.IC1Polarity = TIM_ICPOLARITY_RISING;
  sConfig.IC1Selection = TIM_ICSELECTION_DIRECTTI;
  sConfig.IC1Prescaler = TIM_ICPSC_DIV1;
  sConfig.IC1Filter = 15;
  sConfig.IC2Polarity = TIM_ICPOLARITY_RISING;
  sConfig.IC2Selection = TIM_ICSELECTION_DIRECTTI;
  sConfig.IC2Prescaler = TIM_ICPSC_DIV1;
  sConfig.IC2Filter = 15;
  if (HAL_TIM_Encoder_Init(&htim2, &sConfig) != HAL_OK)
  {
    Error_Handler();
  }
  sMasterConfig.MasterOutputTrigger = TIM_TRGO_RESET;
  sMasterConfig.MasterSlaveMode = TIM_MASTERSLAVEMODE_DISABLE;
  if (HAL_TIMEx_MasterConfigSynchronization(&htim2, &sMasterConfig) != HAL_OK)
  {
    Error_Handler();
  }
  /* USER CODE BEGIN TIM2_Init 2 */

  /* USER CODE END TIM2_Init 2 */

}

/**
  * @brief TIM3 Initialization Function
  * @param None
  * @retval None
  */
static void MX_TIM3_Init(void)
{

  /* USER CODE BEGIN TIM3_Init 0 */

  /* USER CODE END TIM3_Init 0 */

  TIM_ClockConfigTypeDef sClockSourceConfig = {0};
  TIM_MasterConfigTypeDef sMasterConfig = {0};
  TIM_OC_InitTypeDef sConfigOC = {0};

  /* USER CODE BEGIN TIM3_Init 1 */

  /* USER CODE END TIM3_Init 1 */
  htim3.Instance = TIM3;
  htim3.Init.Prescaler = 83;
  htim3.Init.CounterMode = TIM_COUNTERMODE_UP;
  htim3.Init.Period = 999;
  htim3.Init.ClockDivision = TIM_CLOCKDIVISION_DIV1;
  htim3.Init.AutoReloadPreload = TIM_AUTORELOAD_PRELOAD_ENABLE;
  if (HAL_TIM_Base_Init(&htim3) != HAL_OK)
  {
    Error_Handler();
  }
  sClockSourceConfig.ClockSource = TIM_CLOCKSOURCE_INTERNAL;
  if (HAL_TIM_ConfigClockSource(&htim3, &sClockSourceConfig) != HAL_OK)
  {
    Error_Handler();
  }
  if (HAL_TIM_PWM_Init(&htim3) != HAL_OK)
  {
    Error_Handler();
  }
  sMasterConfig.MasterOutputTrigger = TIM_TRGO_RESET;
  sMasterConfig.MasterSlaveMode = TIM_MASTERSLAVEMODE_DISABLE;
  if (HAL_TIMEx_MasterConfigSynchronization(&htim3, &sMasterConfig) != HAL_OK)
  {
    Error_Handler();
  }
  sConfigOC.OCMode = TIM_OCMODE_PWM1;
  sConfigOC.Pulse = 500;
  sConfigOC.OCPolarity = TIM_OCPOLARITY_HIGH;
  sConfigOC.OCFastMode = TIM_OCFAST_DISABLE;
  if (HAL_TIM_PWM_ConfigChannel(&htim3, &sConfigOC, TIM_CHANNEL_1) != HAL_OK)
  {
    Error_Handler();
  }
  /* USER CODE BEGIN TIM3_Init 2 */

  /* USER CODE END TIM3_Init 2 */
  HAL_TIM_MspPostInit(&htim3);

}

/**
  * @brief USART1 Initialization Function
  * @param None
  * @retval None
  */
static void MX_USART1_UART_Init(void)
{

  /* USER CODE BEGIN USART1_Init 0 */

  /* USER CODE END USART1_Init 0 */

  /* USER CODE BEGIN USART1_Init 1 */

  /* USER CODE END USART1_Init 1 */
  huart1.Instance = USART1;
  huart1.Init.BaudRate = 115200;
  huart1.Init.WordLength = UART_WORDLENGTH_8B;
  huart1.Init.StopBits = UART_STOPBITS_1;
  huart1.Init.Parity = UART_PARITY_NONE;
  huart1.Init.Mode = UART_MODE_TX_RX;
  huart1.Init.HwFlowCtl = UART_HWCONTROL_NONE;
  huart1.Init.OverSampling = UART_OVERSAMPLING_16;
  if (HAL_UART_Init(&huart1) != HAL_OK)
  {
    Error_Handler();
  }
  /* USER CODE BEGIN USART1_Init 2 */

  /* USER CODE END USART1_Init 2 */

}

/**
  * @brief USART2 Initialization Function
  * @param None
  * @retval None
  */
static void MX_USART2_UART_Init(void)
{

  /* USER CODE BEGIN USART2_Init 0 */

  /* USER CODE END USART2_Init 0 */

  /* USER CODE BEGIN USART2_Init 1 */

  /* USER CODE END USART2_Init 1 */
  huart2.Instance = USART2;
  huart2.Init.BaudRate = 115200;
  huart2.Init.WordLength = UART_WORDLENGTH_8B;
  huart2.Init.StopBits = UART_STOPBITS_1;
  huart2.Init.Parity = UART_PARITY_NONE;
  huart2.Init.Mode = UART_MODE_TX_RX;
  huart2.Init.HwFlowCtl = UART_HWCONTROL_NONE;
  huart2.Init.OverSampling = UART_OVERSAMPLING_16;
  if (HAL_UART_Init(&huart2) != HAL_OK)
  {
    Error_Handler();
  }
  /* USER CODE BEGIN USART2_Init 2 */

  /* USER CODE END USART2_Init 2 */

}

/**
  * @brief GPIO Initialization Function
  * @param None
  * @retval None
  */
static void MX_GPIO_Init(void)
{
  GPIO_InitTypeDef GPIO_InitStruct = {0};
  /* USER CODE BEGIN MX_GPIO_Init_1 */

  /* USER CODE END MX_GPIO_Init_1 */

  /* GPIO Ports Clock Enable */
  __HAL_RCC_GPIOC_CLK_ENABLE();
  __HAL_RCC_GPIOH_CLK_ENABLE();
  __HAL_RCC_GPIOA_CLK_ENABLE();
  __HAL_RCC_GPIOB_CLK_ENABLE();

  /*Configure GPIO pin Output Level */
  HAL_GPIO_WritePin(LD2_GPIO_Port, LD2_Pin, GPIO_PIN_RESET);

  /*Configure GPIO pin Output Level */
  HAL_GPIO_WritePin(GPIOB, GPIO_PIN_10, GPIO_PIN_RESET);

  /*Configure GPIO pin : B1_Pin */
  GPIO_InitStruct.Pin = B1_Pin;
  GPIO_InitStruct.Mode = GPIO_MODE_IT_FALLING;
  GPIO_InitStruct.Pull = GPIO_NOPULL;
  HAL_GPIO_Init(B1_GPIO_Port, &GPIO_InitStruct);

  /*Configure GPIO pin : LD2_Pin */
  GPIO_InitStruct.Pin = LD2_Pin;
  GPIO_InitStruct.Mode = GPIO_MODE_OUTPUT_PP;
  GPIO_InitStruct.Pull = GPIO_NOPULL;
  GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_LOW;
  HAL_GPIO_Init(LD2_GPIO_Port, &GPIO_InitStruct);

  /*Configure GPIO pin : PB10 */
  GPIO_InitStruct.Pin = GPIO_PIN_10;
  GPIO_InitStruct.Mode = GPIO_MODE_OUTPUT_PP;
  GPIO_InitStruct.Pull = GPIO_NOPULL;
  GPIO_InitStruct.Speed = GPIO_SPEED_FREQ_LOW;
  HAL_GPIO_Init(GPIOB, &GPIO_InitStruct);

  /*Configure GPIO pin : TAMPER_Pin */
  GPIO_InitStruct.Pin = TAMPER_Pin;
  GPIO_InitStruct.Mode = GPIO_MODE_IT_RISING_FALLING;
  GPIO_InitStruct.Pull = GPIO_PULLUP;
  HAL_GPIO_Init(TAMPER_GPIO_Port, &GPIO_InitStruct);

  /*Configure GPIO pin : ENC_SW_Pin */
  GPIO_InitStruct.Pin = ENC_SW_Pin;
  GPIO_InitStruct.Mode = GPIO_MODE_IT_FALLING;
  GPIO_InitStruct.Pull = GPIO_PULLUP;
  HAL_GPIO_Init(ENC_SW_GPIO_Port, &GPIO_InitStruct);

  /* EXTI interrupt init*/
  HAL_NVIC_SetPriority(EXTI9_5_IRQn, 0, 0);
  HAL_NVIC_EnableIRQ(EXTI9_5_IRQn);

  /* USER CODE BEGIN MX_GPIO_Init_2 */

  /* USER CODE END MX_GPIO_Init_2 */
}

/* USER CODE BEGIN 4 */
/* Non-blocking: toggles LD2 and logs every SMOKE_PERIOD_MS; reports B1 edges. */
static void Smoke_Test_Loop(void)
{
  static uint32_t last_tick = 0U;
  static uint32_t count = 0U;
  static GPIO_PinState last_b1 = GPIO_PIN_SET;

  GPIO_PinState b1 = HAL_GPIO_ReadPin(B1_GPIO_Port, B1_Pin);
  if (b1 != last_b1)
  {
    /* B1 is active-low on Nucleo. */
    printf("[DevTest] B1 %s\r\n", (b1 == GPIO_PIN_RESET) ? "PRESSED" : "RELEASED");
    last_b1 = b1;
  }

  uint32_t now = HAL_GetTick();
  if ((now - last_tick) >= SMOKE_PERIOD_MS)
  {
    last_tick = now;
    HAL_GPIO_TogglePin(LD2_GPIO_Port, LD2_Pin);
    printf("[DevTest] alive #%lu t=%lu ms\r\n", count++, now);
  }
}

/* EXTI9_5 is shared (PB5 encoder switch, PA8 tamper later): filter by pin. */
void HAL_GPIO_EXTI_Callback(uint16_t GPIO_Pin)
{
  if (GPIO_Pin == ENC_SW_Pin)
  {
    enc_sw_irq_count++;
  }
  else if (GPIO_Pin == TAMPER_Pin)
  {
    tamper_edge_count++;
    tamper_last_edge_tick = HAL_GetTick();
  }
}

/* Groups EXTI edge bursts from the vibration switch into tamper events:
 * an event starts on the first edge and ends after TAMPER_QUIET_MS of silence.
 * LD2 is on while an event is active. */
static void KY002_Test_Loop(void)
{
  static uint32_t seen_edges = 0U;
  static uint32_t event_start_edges = 0U;
  static uint32_t event_start_tick = 0U;
  static uint32_t event_count = 0U;
  static uint8_t in_event = 0U;
  static uint32_t last_status_tick = 0U;

  uint32_t now = HAL_GetTick();
  uint32_t edges = tamper_edge_count;
  uint32_t last_edge = tamper_last_edge_tick;

  if (edges != seen_edges)
  {
    if (!in_event)
    {
      in_event = 1U;
      event_count++;
      event_start_edges = seen_edges;
      event_start_tick = now;
      HAL_GPIO_WritePin(LD2_GPIO_Port, LD2_Pin, GPIO_PIN_SET);
      printf("[KY002] TAMPER #%lu START\r\n", event_count);
    }
    seen_edges = edges;
  }

  if (in_event && ((now - last_edge) >= TAMPER_QUIET_MS))
  {
    in_event = 0U;
    HAL_GPIO_WritePin(LD2_GPIO_Port, LD2_Pin, GPIO_PIN_RESET);
    printf("[KY002] TAMPER #%lu END   edges=%lu duration=%lu ms level=%d\r\n",
           event_count, seen_edges - event_start_edges, last_edge - event_start_tick,
           (HAL_GPIO_ReadPin(TAMPER_GPIO_Port, TAMPER_Pin) == GPIO_PIN_SET) ? 1 : 0);
  }

  if (!in_event && ((now - last_status_tick) >= TAMPER_STATUS_MS))
  {
    last_status_tick = now;
    printf("[KY002] idle level=%d events=%lu total_edges=%lu\r\n",
           (HAL_GPIO_ReadPin(TAMPER_GPIO_Port, TAMPER_Pin) == GPIO_PIN_SET) ? 1 : 0,
           event_count, seen_edges);
  }
}

/* Logs every detent from TIM2->CNT and the debounced switch level.
 * Switch state comes from a debounced level read, so it works whatever
 * EXTI edge is configured; the IRQ count is printed only as a diagnostic. */
static void KY040_Test_Loop(void)
{
  static uint16_t last_cnt = 0U;
  static int32_t raw_total = 0;
  static int32_t anchor_raw = 0;   /* raw count at the last reported detent */
  static int32_t detent = 0;
  static GPIO_PinState sw_stable = GPIO_PIN_SET;
  static GPIO_PinState sw_candidate = GPIO_PIN_SET;
  static uint32_t sw_change_tick = 0U;

  uint32_t now = HAL_GetTick();

#if ENC_PIN_DIAG
  static int last_pins = -1;
  int clk = (HAL_GPIO_ReadPin(ENC_CLK_GPIO_Port, ENC_CLK_Pin) == GPIO_PIN_SET) ? 1 : 0;
  int dt = (HAL_GPIO_ReadPin(ENC_DT_GPIO_Port, ENC_DT_Pin) == GPIO_PIN_SET) ? 1 : 0;
  int pins = (clk << 1) | dt;
  if (pins != last_pins)
  {
    printf("[KY040] pins CLK=%d DT=%d CNT=%lu raw=%ld anchor=%ld\r\n", clk, dt,
           (unsigned long)__HAL_TIM_GET_COUNTER(&htim2), raw_total, anchor_raw);
    last_pins = pins;
  }
#endif

  /* 16-bit wrap-safe delta: Counter Period is 65535. */
  uint16_t cnt = (uint16_t)__HAL_TIM_GET_COUNTER(&htim2);
  int16_t delta = (int16_t)(uint16_t)(cnt - last_cnt);
  if (delta != 0)
  {
    last_cnt = cnt;
    raw_total += delta;
  }

  /* Hysteresis: step only after a full detent of travel from the last step,
   * so half-click rocking never counts. Uses TIM2 counts only: raw GPIO reads
   * run ~1 count ahead of the filtered timer and must not drive the anchor. */
  while ((raw_total - anchor_raw) >= ENC_COUNTS_PER_DETENT ||
         (raw_total - anchor_raw) <= -ENC_COUNTS_PER_DETENT)
  {
    int32_t dir = (raw_total > anchor_raw) ? 1 : -1;
    anchor_raw += dir * ENC_COUNTS_PER_DETENT;
    detent += dir;
    printf("[KY040] %s detent=%ld raw=%ld CNT=%u\r\n",
           (dir > 0) ? "UP  " : "DOWN", detent, raw_total, cnt);
    HAL_GPIO_TogglePin(LD2_GPIO_Port, LD2_Pin);
  }

  GPIO_PinState sw = HAL_GPIO_ReadPin(ENC_SW_GPIO_Port, ENC_SW_Pin);
  if (sw != sw_candidate)
  {
    sw_candidate = sw;
    sw_change_tick = now;
  }
  else if ((sw_candidate != sw_stable) && ((now - sw_change_tick) >= ENC_SW_DEBOUNCE_MS))
  {
    sw_stable = sw_candidate;
    /* KY-040 SW is active-low. */
    printf("[KY040] SW %s (irq_count=%lu)\r\n",
           (sw_stable == GPIO_PIN_RESET) ? "PRESSED" : "RELEASED",
           enc_sw_irq_count);
  }
}

static void Buzzer_Off(void)
{
  __HAL_TIM_SET_COMPARE(&htim3, TIM_CHANNEL_1, 0U);
}

/* Blocking tone at BUZZER_DUTY_PERCENT; frequency and length are clamped so
 * the unbuffered pin is never driven for long. */
static void Buzzer_Beep(uint32_t freq_hz, uint32_t duration_ms)
{
  if (freq_hz < BUZZER_MIN_HZ) freq_hz = BUZZER_MIN_HZ;
  if (freq_hz > BUZZER_MAX_HZ) freq_hz = BUZZER_MAX_HZ;
  if (duration_ms > BUZZER_MAX_BEEP_MS) duration_ms = BUZZER_MAX_BEEP_MS;

  uint32_t period = BUZZER_TICK_HZ / freq_hz;   /* ticks per cycle = ARR + 1 */
  __HAL_TIM_SET_AUTORELOAD(&htim3, period - 1U);
  __HAL_TIM_SET_COMPARE(&htim3, TIM_CHANNEL_1, (period * BUZZER_DUTY_PERCENT) / 100U);
  /* Load the preloaded ARR/CCR now instead of at the next update event. */
  HAL_TIM_GenerateEvent(&htim3, TIM_EVENTSOURCE_UPDATE);

  HAL_Delay(duration_ms);
  Buzzer_Off();
}

/* Plays a frequency sweep, then the beep patterns planned for the vault.
 * Runs once at boot and again on every B1 press. */
static void KY006_Test_Loop(void)
{
  static const uint16_t sweep_hz[] = { 500U, 1000U, 2000U, 2700U, 4000U };
  static uint8_t run_pending = 1U;
  static GPIO_PinState last_b1 = GPIO_PIN_SET;

  GPIO_PinState b1 = HAL_GPIO_ReadPin(B1_GPIO_Port, B1_Pin);
  if ((b1 == GPIO_PIN_RESET) && (last_b1 == GPIO_PIN_SET))
  {
    run_pending = 1U;
  }
  last_b1 = b1;

  if (!run_pending)
  {
    return;
  }
  run_pending = 0U;
  HAL_GPIO_WritePin(LD2_GPIO_Port, LD2_Pin, GPIO_PIN_SET);

  for (uint32_t i = 0U; i < (sizeof(sweep_hz) / sizeof(sweep_hz[0])); i++)
  {
    printf("[KY006] sweep %u Hz\r\n", sweep_hz[i]);
    Buzzer_Beep(sweep_hz[i], 200U);
    HAL_Delay(400U);
  }

  printf("[KY006] pattern OK (2 short high)\r\n");
  Buzzer_Beep(2700U, 80U);
  HAL_Delay(80U);
  Buzzer_Beep(2700U, 80U);
  HAL_Delay(800U);

  printf("[KY006] pattern ERROR (1 long low)\r\n");
  Buzzer_Beep(500U, 300U);
  HAL_Delay(800U);

  printf("[KY006] pattern ALARM (two-tone x6)\r\n");
  for (uint32_t i = 0U; i < 6U; i++)
  {
    Buzzer_Beep(((i % 2U) == 0U) ? 2000U : 3000U, 150U);
  }

  HAL_GPIO_WritePin(LD2_GPIO_Port, LD2_Pin, GPIO_PIN_RESET);
  printf("[KY006] done - press B1 to replay\r\n");
}

/* Sends "PING <n>\n" on USART1 every LINK_PING_PERIOD_MS and expects
 * "PONG <n>\n" back within LINK_REPLY_TIMEOUT_MS. Logs OK / BAD / TIMEOUT
 * with round-trip time; LD2 toggles on every good reply. */
static void UartLink_Test_Loop(void)
{
  static uint32_t last_ping_tick = 0U;
  static uint32_t seq = 0U;
  static uint32_t ok_count = 0U;
  static uint32_t bad_count = 0U;
  static uint32_t timeout_count = 0U;

  uint32_t now = HAL_GetTick();
  if ((now - last_ping_tick) < LINK_PING_PERIOD_MS)
  {
    return;
  }
  last_ping_tick = now;
  seq++;

  char tx[LINK_LINE_MAX];
  char expected[LINK_LINE_MAX];
  char rx[LINK_LINE_MAX];
  int tx_len = snprintf(tx, sizeof(tx), "PING %lu\n", seq);
  snprintf(expected, sizeof(expected), "PONG %lu", seq);

  /* Drop stale bytes / overrun left from before this exchange. */
  __HAL_UART_CLEAR_OREFLAG(&huart1);
  uint8_t junk;
  while (HAL_UART_Receive(&huart1, &junk, 1U, 0U) == HAL_OK) { }

  uint32_t t0 = DWT->CYCCNT;
  if (HAL_UART_Transmit(&huart1, (uint8_t *)tx, (uint16_t)tx_len, 10U) != HAL_OK)
  {
    printf("[LINK] #%lu TX failed\r\n", seq);
    return;
  }

  /* Collect one reply line; no USART2 printing until it is complete. */
  size_t rx_len = 0U;
  uint8_t got_line = 0U;
  uint8_t overflow = 0U;
  uint32_t start_tick = HAL_GetTick();
  while ((HAL_GetTick() - start_tick) < LINK_REPLY_TIMEOUT_MS)
  {
    uint8_t c;
    if (HAL_UART_Receive(&huart1, &c, 1U, 1U) != HAL_OK)
    {
      continue;
    }
    if (c == '\r')
    {
      continue;
    }
    if (c == '\n')
    {
      got_line = 1U;
      break;
    }
    if (rx_len < (sizeof(rx) - 1U))
    {
      rx[rx_len++] = (char)c;
    }
    else
    {
      overflow = 1U;
    }
  }
  uint32_t rtt_us = (DWT->CYCCNT - t0) / (HAL_RCC_GetHCLKFreq() / 1000000U);
  rx[rx_len] = '\0';

  if (!got_line)
  {
    timeout_count++;
    printf("[LINK] #%lu TIMEOUT (partial=\"%s\")\r\n", seq, rx);
  }
  else if (!overflow && (strcmp(rx, expected) == 0))
  {
    ok_count++;
    HAL_GPIO_TogglePin(LD2_GPIO_Port, LD2_Pin);
    printf("[LINK] #%lu OK \"%s\" rtt=%lu us\r\n", seq, rx, rtt_us);
  }
  else
  {
    bad_count++;
    printf("[LINK] #%lu BAD got=\"%s\" expected=\"%s\"%s\r\n",
           seq, rx, expected, overflow ? " (overflow)" : "");
  }

  if ((seq % LINK_STATS_EVERY) == 0U)
  {
    printf("[LINK] stats sent=%lu ok=%lu bad=%lu timeout=%lu\r\n",
           seq, ok_count, bad_count, timeout_count);
  }
}
/* USER CODE END 4 */

/**
  * @brief  This function is executed in case of error occurrence.
  * @retval None
  */
void Error_Handler(void)
{
  /* USER CODE BEGIN Error_Handler_Debug */
  /* User can add his own implementation to report the HAL error return state */
  __disable_irq();
  while (1)
  {
  }
  /* USER CODE END Error_Handler_Debug */
}
#ifdef USE_FULL_ASSERT
/**
  * @brief  Reports the name of the source file and the source line number
  *         where the assert_param error has occurred.
  * @param  file: pointer to the source file name
  * @param  line: assert_param error line source number
  * @retval None
  */
void assert_failed(uint8_t *file, uint32_t line)
{
  /* USER CODE BEGIN 6 */
  /* User can add his own implementation to report the file name and line number,
     ex: printf("Wrong parameters value: file %s on line %d\r\n", file, line) */
  /* USER CODE END 6 */
}
#endif /* USE_FULL_ASSERT */
