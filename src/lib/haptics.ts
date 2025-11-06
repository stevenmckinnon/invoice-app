/**
 * Haptic feedback utility for iOS-like interactions
 * Provides tactile feedback on supported devices
 */

type HapticType = "light" | "medium" | "heavy" | "success" | "warning" | "error";

const isIOS = () => {
  if (typeof window === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
};

const isAndroid = () => {
  if (typeof window === "undefined") return false;
  return /Android/.test(navigator.userAgent);
};

/**
 * Trigger haptic feedback
 * @param type - The type of haptic feedback to trigger
 */
export const haptic = (type: HapticType = "medium") => {
  if (typeof window === "undefined") return;

  // iOS Haptic Feedback
  if (isIOS() && "vibrate" in navigator) {
    // iOS uses different vibration patterns
    const patterns: Record<HapticType, number | number[]> = {
      light: 5,
      medium: 10,
      heavy: 15,
      success: [10, 50, 10],
      warning: [20, 50, 20],
      error: [30, 50, 30],
    };

    try {
      navigator.vibrate(patterns[type]);
    } catch (e) {
      // Silently fail if vibration is not supported
    }
  }
  // Android Haptic Feedback
  else if (isAndroid() && "vibrate" in navigator) {
    const patterns: Record<HapticType, number | number[]> = {
      light: 10,
      medium: 20,
      heavy: 30,
      success: [10, 50, 10],
      warning: [20, 50, 20],
      error: [30, 50, 30],
    };

    try {
      navigator.vibrate(patterns[type]);
    } catch (e) {
      // Silently fail if vibration is not supported
    }
  }
};

/**
 * Light haptic feedback (for subtle interactions)
 */
export const hapticLight = () => haptic("light");

/**
 * Medium haptic feedback (for standard interactions)
 */
export const hapticMedium = () => haptic("medium");

/**
 * Heavy haptic feedback (for important interactions)
 */
export const hapticHeavy = () => haptic("heavy");

/**
 * Success haptic feedback (for successful actions)
 */
export const hapticSuccess = () => haptic("success");

/**
 * Warning haptic feedback (for warnings)
 */
export const hapticWarning = () => haptic("warning");

/**
 * Error haptic feedback (for errors)
 */
export const hapticError = () => haptic("error");

