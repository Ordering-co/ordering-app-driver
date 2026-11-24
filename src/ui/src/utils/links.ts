/**
 * Which links the app opens without asking the system first. `Linking.canOpenURL` answers only for what the app has declared it may
 * look for (Android 11+: the manifest's `<queries>`; iOS: `LSApplicationQueriesSchemes`), so for a scheme the app has not declared it
 * says `false` although the phone has an app for it: a phone link then showed "Link could not be opened". These schemes are the
 * system's own, each handled by an app every phone has (the dialler, messages, mail), and the answer would change nothing the app
 * offers, so they are opened with `Linking.openURL` straight away and a refusal (no app, a phone without a SIM) is told to the driver.
 * Every other scheme keeps the question first: a maps app's link is offered only when that app is there.
 */
const SYSTEM_SCHEMES = ['tel', 'sms', 'mailto']

/** The scheme of a link in lowercase, without its colon ('' when it has none). */
export const linkScheme = (url: string): string => /^([a-z][a-z0-9+.-]*):/i.exec(String(url ?? '').trim())?.[1].toLowerCase() ?? ''

/** A link of the system's own schemes (`tel:`, `sms:`, `mailto:`): opened without `Linking.canOpenURL`. */
export const opensWithoutAsking = (url: string): boolean => SYSTEM_SCHEMES.includes(linkScheme(url))
