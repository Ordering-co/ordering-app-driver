/**
 * The driver location module as the app sees it (docs/LOCATION_MODULE.md §2): the only
 * importer of the codegen spec (`NativeDriverLocation.ts`). Where the native module is not
 * built in (Jest, a build without it) every call resolves to a disabled state and the
 * subscriptions do nothing: nothing here throws because the module is absent.
 */
import NativeDriverLocation from './NativeDriverLocation';
import type {
  DriverLocationConfig,
  DriverLocationFix,
  DriverLocationHttp,
  DriverLocationState
} from './NativeDriverLocation';

export type { DriverLocationFix, DriverLocationHttp, DriverLocationState };

/** What `onState` says: sending stopped, a mock position was dropped, or the device changed under the module. */
export type DriverLocationStateKind =
  | 'unauthorized'
  | 'mock_rejected'
  | 'authorization_changed'
  | 'services_disabled'
  | 'services_enabled';

export type DriverLocationAuthorization = 'always' | 'when_in_use' | 'denied' | 'restricted' | 'not_determined';

export interface DriverLocationOptions {
  /** `${root}/users/${id}/locations`. A different url empties the pending queue. */
  url: string;
  /** `{ Authorization: 'Bearer …' }`. */
  headers: Record<string, string>;
  /** Merged at the root of the body (`{ driver_id }`). */
  extras: Record<string, string | number>;
  /** Metres between two positions. */
  distanceFilter: number;
  /** Android: wanted and fastest interval between positions, in ms. */
  interval: number;
  fastestInterval: number;
  /** Android: the texts of the foreground service's notification. */
  notification: { title: string; text: string };
  /** Positions kept while they cannot be sent (default 500). */
  maxQueue?: number;
  /** "Latest wins" (default true). */
  discardOlderOnSuccess?: boolean;
  /**
   * Debug builds only (default false): drop a simulated position (`mock_rejected`) instead of
   * sending it as a real one. A release build always drops it.
   */
  rejectMock?: boolean;
  /**
   * Minimum time between the start of two requests to the API, in ms (integer, default 0 = off). The module
   * keeps the newest position meanwhile and sends it when the time has elapsed. Reconfiguring it does not
   * restart tracking.
   */
  minSendIntervalMs?: number;
  /**
   * Send `location_at` in the body: the UTC time the position was taken, `YYYY-MM-DD HH:mm:ss` (default
   * false = today's body).
   */
  sendLocationAt?: boolean;
  /**
   * `${root}/tracking_events`: turns the native events recorder on (GPS off / on, connection, permission, background,
   * battery saver, simulated position, tracking started / stopped, kept on the phone and sent when there is a
   * connection). Absent (default) = off, nothing is recorded, written or sent.
   */
  eventsUrl?: string;
}

/** Why tracking starts: the `reason` of the `tracking_started` event (`permission`: tracking resumes after a stop for the permission; the module says `restart` itself after a stop by the system). */
export type DriverLocationStartReason = 'available' | 'schedule' | 'login' | 'permission' | 'restart';

/** Why tracking stops: the `reason` of the `tracking_stopped` event. The module also records `system` and `session_revoked` by itself. */
export type DriverLocationStopReason = 'unavailable' | 'logout' | 'schedule' | 'permission' | 'session_revoked' | 'unknown';

export interface DriverLocationSubscription {
  remove: () => void;
}

export const DEFAULT_MAX_QUEUE = 500;

/** The state reported when there is no native module. */
export const DISABLED_STATE: DriverLocationState = {
  enabled: false,
  tracking: false,
  queued: 0,
  lastLocationAt: null,
  lastHttpStatus: null,
  authorization: 'not_determined',
  servicesEnabled: true
};

const NO_SUBSCRIPTION: DriverLocationSubscription = { remove: () => undefined };

/** True where the native module is built in. */
export const isDriverLocationAvailable = (): boolean => !!NativeDriverLocation;

const toNativeConfig = (options: DriverLocationOptions): DriverLocationConfig => ({
  url: options.url,
  headers: options.headers,
  extras: options.extras,
  distanceFilter: options.distanceFilter,
  interval: options.interval,
  fastestInterval: options.fastestInterval,
  notificationTitle: options.notification.title,
  notificationText: options.notification.text,
  maxQueue: options.maxQueue ?? DEFAULT_MAX_QUEUE,
  discardOlderOnSuccess: options.discardOlderOnSuccess ?? true,
  rejectMock: options.rejectMock ?? false,
  minSendIntervalMs: options.minSendIntervalMs ?? 0,
  sendLocationAt: options.sendLocationAt ?? false,
  ...(options.eventsUrl ? { eventsUrl: options.eventsUrl } : {})
});

/**
 * Sets (or replaces) the configuration. Called again with a new token it swaps the headers of
 * the running sender without restarting the location updates. Rejects when the configuration
 * is not valid (`E_CONFIG`).
 */
export const configure = (options: DriverLocationOptions): Promise<DriverLocationState> =>
  NativeDriverLocation ? NativeDriverLocation.configure(toNativeConfig(options)) : Promise.resolve(DISABLED_STATE);

/** Starts tracking. `reason` (the contract's `tracking_started` reason) is optional: without it the event says `available`. */
export const start = (reason?: DriverLocationStartReason): Promise<DriverLocationState> =>
  NativeDriverLocation ? NativeDriverLocation.start(reason) : Promise.resolve(DISABLED_STATE);

/** Stops tracking. `reason` (the contract's `tracking_stopped` reason) is optional: without it the event says `unknown`. */
export const stop = (reason?: DriverLocationStopReason): Promise<DriverLocationState> =>
  NativeDriverLocation ? NativeDriverLocation.stop(reason) : Promise.resolve(DISABLED_STATE);

export const getState = (): Promise<DriverLocationState> =>
  NativeDriverLocation ? NativeDriverLocation.getState() : Promise.resolve(DISABLED_STATE);

/** Tries to send what is pending now. */
export const flush = (): Promise<void> =>
  NativeDriverLocation ? NativeDriverLocation.flush() : Promise.resolve();

/**
 * Tells the native side which host is the Ordering API's, so the device id header goes there and to no other host (native
 * request headers, `CLAUDE.md`). Call it with `ordering.root` as soon as it is known; until then no request carries the id.
 * Where the native module is not built in it does nothing and returns false.
 */
export const setApiRoot = (root: string): boolean => {
  try {
    return NativeDriverLocation ? NativeDriverLocation.setApiRoot(root) : false;
  } catch {
    return false;
  }
};

/** A position the module accepted; `mock` tells the truth even when a debug build sent it as a real one. */
export const onLocation = (callback: (fix: DriverLocationFix) => void): DriverLocationSubscription =>
  NativeDriverLocation ? NativeDriverLocation.onLocation(callback) : NO_SUBSCRIPTION;

/** An answer of the server to a sent position. */
export const onHttp = (callback: (response: DriverLocationHttp) => void): DriverLocationSubscription =>
  NativeDriverLocation ? NativeDriverLocation.onHttp(callback) : NO_SUBSCRIPTION;

/** `unauthorized` (once), `mock_rejected`, `authorization_changed`, `services_disabled`, `services_enabled`. */
export const onState = (callback: (kind: DriverLocationStateKind) => void): DriverLocationSubscription =>
  NativeDriverLocation
    ? NativeDriverLocation.onState(event => callback(event.kind as DriverLocationStateKind))
    : NO_SUBSCRIPTION;
