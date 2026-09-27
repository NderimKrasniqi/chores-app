import * as Device from "expo-device";

/** "iPhone 17e", or "Phone" when the platform won't say. Display only. */
export function currentDeviceLabel() {
  return Device.modelName ?? Device.deviceName ?? undefined;
}
