import { AuthData } from "../types/auth";

export function getPrimaryImage(authData: AuthData, itemId: string, width = 500) {
  return `${authData.serverUrl}/Items/${itemId}/Images/Primary?fillWidth=${width}&quality=90&api_key=${authData.token}`;
}

export function getBackdropImage(authData: AuthData, itemId: string, width = 1920) {
  return `${authData.serverUrl}/Items/${itemId}/Images/Backdrop?fillWidth=${width}&quality=90&api_key=${authData.token}`;
}

export function getLogoImage(authData: AuthData, itemId: string, width = 480) {
  return `${authData.serverUrl}/Items/${itemId}/Images/Logo?fillWidth=${width}&quality=90&api_key=${authData.token}`;
}