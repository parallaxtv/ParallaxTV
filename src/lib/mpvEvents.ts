import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type {
  MpvEvent,
  MpvEventFromProperties,
  MpvObservableProperty,
} from "tauri-plugin-libmpv-api";

type MpvEventHandler = (event: MpvEvent) => void;

let nativeUnlisten: UnlistenFn | null = null;
let nativeStart: Promise<void> | null = null;
const handlers = new Set<MpvEventHandler>();

async function ensureNativeMpvListener() {
  if (nativeUnlisten || nativeStart) return nativeStart;

  const eventName = `mpv-event-${getCurrentWindow().label}`;
  nativeStart = listen<MpvEvent>(eventName, (event) => {
    handlers.forEach((handler) => handler(event.payload));
  })
    .then((unlisten) => {
      nativeUnlisten = unlisten;
    })
    .finally(() => {
      nativeStart = null;
    });

  return nativeStart;
}

export function listenMpvEvents(handler: MpvEventHandler) {
  let disposed = false;
  handlers.add(handler);

  ensureNativeMpvListener().catch((error) => {
    if (!disposed) console.error("[MPV] Event listener failed", error);
  });

  return () => {
    disposed = true;
    handlers.delete(handler);
  };
}

export function observeMpvProperties<const T extends ReadonlyArray<MpvObservableProperty>>(
  properties: T,
  handler: (event: MpvEventFromProperties<T[number]>) => void,
) {
  const propertyNames = new Set(properties.map((property) => property[0]));

  return listenMpvEvents((event) => {
    if (
      event.event === "property-change" &&
      event.name &&
      propertyNames.has(event.name)
    ) {
      handler(event as MpvEventFromProperties<T[number]>);
    }
  });
}

export async function stopMpvEventListener() {
  handlers.clear();

  if (nativeUnlisten) {
    const unlisten = nativeUnlisten;
    nativeUnlisten = null;
    await unlisten();
  }
}
