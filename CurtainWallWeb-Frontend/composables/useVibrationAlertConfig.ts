export type AlertLevel = "normal" | "level3" | "level2" | "level1";
export type ThresholdSource = "manual" | "agent";

export interface VibrationAlertConfig {
  thresholdSource: ThresholdSource;
  level1Ratio: number;
  level2Ratio: number;
  level3Ratio: number;
  level1EmailCooldownMinutes: number;
  level2EmailCooldownMinutes: number;
  level3EmailCooldownMinutes: number;
}

export interface AlertMetrics {
  actualValue: number | null;
  standardValue: number | null;
  deviation: number | null;
  level: AlertLevel;
}

export interface DerivedThresholds {
  baseThreshold: number | null;
  level1Threshold: number | null;
  level2Threshold: number | null;
  level3Threshold: number | null;
}

const STORAGE_KEY = "vibration-alert-config-v2";

export const defaultVibrationAlertConfig: VibrationAlertConfig = {
  thresholdSource: "manual",
  level1Ratio: 1,
  level2Ratio: 0.75,
  level3Ratio: 0.5,
  level1EmailCooldownMinutes: 10,
  level2EmailCooldownMinutes: 30,
  level3EmailCooldownMinutes: 60
};

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const clampPositiveInteger = (value: unknown, fallback: number) => {
  const numericValue = toFiniteNumber(value);
  return numericValue === null ? fallback : Math.max(1, Math.round(numericValue));
};

const normalizeThresholdSource = (value: unknown): ThresholdSource =>
  value === "agent" ? "agent" : "manual";

const normalizeConfig = (config?: Partial<VibrationAlertConfig>): VibrationAlertConfig => ({
  thresholdSource: normalizeThresholdSource(config?.thresholdSource),
  level1Ratio: 1,
  level2Ratio: 0.75,
  level3Ratio: 0.5,
  level1EmailCooldownMinutes: clampPositiveInteger(
    config?.level1EmailCooldownMinutes,
    defaultVibrationAlertConfig.level1EmailCooldownMinutes
  ),
  level2EmailCooldownMinutes: clampPositiveInteger(
    config?.level2EmailCooldownMinutes,
    defaultVibrationAlertConfig.level2EmailCooldownMinutes
  ),
  level3EmailCooldownMinutes: clampPositiveInteger(
    config?.level3EmailCooldownMinutes,
    defaultVibrationAlertConfig.level3EmailCooldownMinutes
  )
});

const readStoredConfigs = (): Record<string, VibrationAlertConfig> => {
  if (!process.client) {
    return {};
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {};
    }

    const parsed = JSON.parse(raw) as Record<string, Partial<VibrationAlertConfig>>;
    return Object.fromEntries(
      Object.entries(parsed).map(([deviceName, config]) => [
        deviceName,
        normalizeConfig(config)
      ])
    );
  } catch {
    return {};
  }
};

const writeStoredConfigs = (configs: Record<string, VibrationAlertConfig>) => {
  if (process.client) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
  }
};

export const deriveConfigFromThresholds = (
  _values: Array<number | string | null | undefined>,
  fallback?: Partial<VibrationAlertConfig>
): VibrationAlertConfig => normalizeConfig(fallback);

export const getVibrationAlertConfig = (
  deviceName?: string,
  fallback?: Partial<VibrationAlertConfig>
): VibrationAlertConfig => {
  if (!deviceName) {
    return normalizeConfig(fallback);
  }

  const configs = readStoredConfigs();
  return normalizeConfig({
    ...fallback,
    ...configs[deviceName]
  });
};

export const saveVibrationAlertConfig = (
  deviceName: string,
  config: Partial<VibrationAlertConfig>
): VibrationAlertConfig => {
  const normalized = normalizeConfig(config);
  if (!deviceName || !process.client) {
    return normalized;
  }

  const configs = readStoredConfigs();
  configs[deviceName] = normalized;
  writeStoredConfigs(configs);
  return normalized;
};

const roundThreshold = (value: number) => Number(value.toFixed(6));

export const deriveThresholdsFromBase = (
  baseThreshold: number | null | undefined,
  config: VibrationAlertConfig
): DerivedThresholds => {
  if (typeof baseThreshold !== "number" || !Number.isFinite(baseThreshold) || baseThreshold <= 0) {
    return {
      baseThreshold: null,
      level1Threshold: null,
      level2Threshold: null,
      level3Threshold: null
    };
  }

  return {
    baseThreshold: roundThreshold(baseThreshold),
    level1Threshold: roundThreshold(baseThreshold * config.level1Ratio),
    level2Threshold: roundThreshold(baseThreshold * config.level2Ratio),
    level3Threshold: roundThreshold(baseThreshold * config.level3Ratio)
  };
};

const getThresholdFromRange = (record: Record<string, unknown>) => {
  const minValue = toFiniteNumber(record.min);
  const maxValue = toFiniteNumber(record.max);
  if (minValue === null || maxValue === null || maxValue <= minValue) {
    return null;
  }
  return Math.abs(maxValue - minValue) / 2;
};

const firstNumericField = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = toFiniteNumber(record[key]);
    if (value !== null) {
      return value;
    }
  }
  return null;
};

const getExplicitLevel = (record: Record<string, unknown>): AlertLevel | null => {
  const rawLevel = String(
    record.alert_level ?? record.alertLevel ?? record.level ?? record.warning_level ?? ""
  ).toLowerCase();

  if (["level1", "一级", "1"].includes(rawLevel)) {
    return "level1";
  }
  if (["level2", "二级", "2"].includes(rawLevel)) {
    return "level2";
  }
  if (["level3", "三级", "3"].includes(rawLevel)) {
    return "level3";
  }

  const rawType = String(record.type ?? "").toLowerCase();
  if (rawType === "alarm") {
    return "level2";
  }
  if (rawType === "warning") {
    return "level3";
  }

  return null;
};

export const deriveAlertMetrics = (
  rawRecord: Record<string, unknown>,
  config: VibrationAlertConfig
): AlertMetrics => {
  const actualValue = firstNumericField(rawRecord, [
    "actual_value",
    "actualValue",
    "data",
    "value"
  ]);

  let standardValue = firstNumericField(rawRecord, [
    "standard_value",
    "standardValue",
    "baseline_value",
    "baselineValue",
    "predicted_value",
    "predictedValue",
    "expected_value",
    "expectedValue"
  ]);

  let deviation = firstNumericField(rawRecord, [
    "deviation",
    "absolute_difference",
    "absoluteDifference",
    "difference",
    "delta"
  ]);

  const minValue = firstNumericField(rawRecord, ["min"]);
  const maxValue = firstNumericField(rawRecord, ["max"]);

  if (standardValue === null && actualValue !== null) {
    if (minValue !== null && maxValue !== null) {
      standardValue = (minValue + maxValue) / 2;
    } else if (maxValue !== null && actualValue > maxValue) {
      standardValue = maxValue;
    } else if (minValue !== null && actualValue < minValue) {
      standardValue = minValue;
    }
  }

  if (deviation === null && actualValue !== null && standardValue !== null) {
    deviation = Math.abs(actualValue - standardValue);
  }

  let level: AlertLevel = "normal";
  const explicitLevel = getExplicitLevel(rawRecord);
  const derivedThresholds = deriveThresholdsFromBase(getThresholdFromRange(rawRecord), config);

  if (deviation !== null && derivedThresholds.level1Threshold !== null) {
    if (deviation >= derivedThresholds.level1Threshold) {
      level = "level1";
    } else if (deviation >= derivedThresholds.level2Threshold!) {
      level = "level2";
    } else if (deviation >= derivedThresholds.level3Threshold!) {
      level = "level3";
    }
  } else if (explicitLevel) {
    level = explicitLevel;
  }

  return {
    actualValue,
    standardValue,
    deviation,
    level
  };
};

export const getThresholdSourceLabel = (source: ThresholdSource): string =>
  source === "agent" ? "Agent 推荐" : "人工设置";

export const getAlertLevelLabel = (level: AlertLevel): string => {
  switch (level) {
    case "level1":
      return "一级预警";
    case "level2":
      return "二级预警";
    case "level3":
      return "三级预警";
    default:
      return "正常";
  }
};

export const getAlertLevelTagType = (
  level: AlertLevel
): "success" | "warning" | "info" | "primary" | "danger" => {
  switch (level) {
    case "level1":
      return "danger";
    case "level2":
      return "warning";
    case "level3":
      return "primary";
    default:
      return "info";
  }
};

export const getAlertLevelClass = (level: AlertLevel): string => {
  switch (level) {
    case "level1":
      return "alarm-level";
    case "level2":
      return "warning-level";
    case "level3":
      return "notice-level";
    default:
      return "normal-level";
  }
};
