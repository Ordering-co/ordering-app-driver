/**
 * The codegen spec of the app's own driver location module (docs/LOCATION_MODULE.md).
 * Native code implements it on both platforms (Android: Kotlin over
 * `android/driverlocation-core`; iOS: Swift over `ios/DriverLocationCore`).
 *
 * Nothing imports this file but `src/native/driverLocation.ts`, the wrapper the app uses.
 */
import type { CodegenTypes, TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type DriverLocationConfig = {
  /** `${root}/users/${id}/locations`. A different url empties the pending queue. */
  url: string;
  /** Request headers (`Authorization`). Values are strings. */
  headers: CodegenTypes.UnsafeObject;
  /** Merged at the root of the body, beside `location` (`driver_id`). Strings or numbers. */
  extras: CodegenTypes.UnsafeObject;
  /** Metres between two positions. */
  distanceFilter: number;
  /** Android: the wanted and the fastest interval between positions, in ms. */
  interval: number;
  fastestInterval: number;
  /** Android: the texts of the foreground service's notification. */
  notificationTitle: string;
  notificationText: string;
  /** Positions kept while they cannot be sent; the oldest is dropped beyond it. */
  maxQueue: number;
  /** "Latest wins": send the newest pending position and discard the older ones once it is accepted. */
  discardOlderOnSuccess: boolean;
  /**
   * Debug builds only: drop a simulated (mock) position instead of sending it. Off by default in
   * debug, where a simulated position is sent as a real one (the request body never has a `mock`
   * key) so it can be seen on the server. A release build always drops simulated positions, whatever this says.
   */
  rejectMock: boolean;
  /**
   * A floor, in ms, between the START of a request to the API and the start of the previous one
   * (monotonic clock; a retry counts as a request). 0 = no throttle. Positions that arrive meanwhile are not
   * lost: the newest is sent when the interval has elapsed, with no new position needed.
   */
  minSendIntervalMs: number;
  /**
   * Add `location_at` to the body: when the position was TAKEN (not sent), UTC, `YYYY-MM-DD HH:mm:ss`.
   * false = the body is exactly as before.
   */
  sendLocationAt: boolean;
  /**
   * `${root}/tracking_events`: where the module sends the events it records while tracking (GPS off / on, connection lost /
   * restored, permission, background, battery saver, simulated position, tracking started / stopped). Absent = the
   * recorder is off and nothing about it is read, written or sent.
   */
  eventsUrl?: string;
};

export type DriverLocationState = {
  /** `configure` was called with a valid configuration. */
  enabled: boolean;
  /** Positions are being taken (between `start` and `stop`). */
  tracking: boolean;
  /** Positions waiting to be sent. */
  queued: number;
  /** Epoch ms of the last accepted position, or null. */
  lastLocationAt: number | null;
  /** Status of the last answer of the server, or null. */
  lastHttpStatus: number | null;
  /** `always` | `when_in_use` | `denied` | `restricted` | `not_determined`. */
  authorization: string;
  /** The device's location services are on. */
  servicesEnabled: boolean;
};

export type DriverLocationFix = {
  lat: number;
  lng: number;
  accuracy: number | null;
  speed: number | null;
  /** Epoch ms. */
  timestamp: number;
  mock: boolean;
};

export type DriverLocationHttp = {
  success: boolean;
  status: number;
};

export type DriverLocationStateEvent = {
  /** `unauthorized` | `mock_rejected` | `authorization_changed` | `services_disabled` | `services_enabled`. */
  kind: string;
};

export interface Spec extends TurboModule {
  configure(config: DriverLocationConfig): Promise<DriverLocationState>;
  /** `reason`: `available` | `schedule` | `login` | `permission` | `restart`; the `tracking_started` event says it. Optional (an older caller). */
  start(reason?: string): Promise<DriverLocationState>;
  /** `reason`: `unavailable` | `logout` | `schedule` | `permission` | `session_revoked` | `unknown`; the `tracking_stopped` event says it. */
  stop(reason?: string): Promise<DriverLocationState>;
  getState(): Promise<DriverLocationState>;
  /** Try to send what is pending now. */
  flush(): Promise<void>;
  /**
   * The Ordering API's root (`ordering.root`). The device id header (`X-Device-Id-X`) goes to this host and to no other: until it is
   * known no request carries it (the owner's decision of 2026-11-19). Synchronous, so it is set before the next request leaves.
   * Returns false when the text is not an http(s) URL (the host is then cleared).
   */
  setApiRoot(root: string): boolean;

  readonly onLocation: CodegenTypes.EventEmitter<DriverLocationFix>;
  readonly onHttp: CodegenTypes.EventEmitter<DriverLocationHttp>;
  readonly onState: CodegenTypes.EventEmitter<DriverLocationStateEvent>;
}

/** Null where the native module is not built in (Jest, a build without it). */
export default TurboModuleRegistry.get<Spec>('DriverLocation');
