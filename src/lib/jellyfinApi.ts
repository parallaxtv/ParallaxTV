import { jellyfin } from "./jellyfin";

export function createJellyfinApi(
  serverUrl: string,
  token: string
) {
  const api = jellyfin.createApi(serverUrl);

  api.accessToken = token;

  return api;
}