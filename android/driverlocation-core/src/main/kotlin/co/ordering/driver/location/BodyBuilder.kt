package co.ordering.driver.location

import java.math.BigDecimal
import java.math.MathContext

/**
 * Builds the request body, the exact JSON the API gets (settled against the local API):
 *
 *     {"location":{"lat":<n>,"lng":<n>,"v":"1.0"},"driver_id":<extras...>}
 *
 * There is no `mock` key (the owner's decision of 2026-11-17): whether a fix is simulated is
 * decided by [MockPolicy] before the body is built, never by the body. `location` is a JSON object, its keys in that order; the extras are merged at the root,
 * after `location`, in the order of the map. Compact, no spaces; numbers are plain
 * decimals (shortest digits that read back to the same double, never an exponent, no
 * locale). Written by hand: `org.json` is on Android but not on the JVM.
 *
 * With `sendLocationAt` (`Config.sendLocationAt`, default off) one key is added at the top level, right
 * after `location`: `"location_at":"2026-11-19 14:03:07"`, the time the fix was TAKEN ([LocationAt]).
 * Off, the body is exactly the one above.
 */
object BodyBuilder {
    const val ROOT_PROPERTY = "location"
    const val VERSION = "1.0"
    const val LOCATION_AT_PROPERTY = "location_at"
    private val RESERVED_ROOT_KEYS = setOf(ROOT_PROPERTY)

    /** @throws IllegalArgumentException if an extras key would collide with `location` (or with `location_at` when it is sent). */
    fun checkExtras(extras: Map<String, Any>, sendLocationAt: Boolean = false) {
        extras.keys.forEach {
            require(it !in RESERVED_ROOT_KEYS && !(sendLocationAt && it == LOCATION_AT_PROPERTY)) {
                "extras key '$it' collides with the body"
            }
        }
    }

    fun build(fix: LocationFix, extras: Map<String, Any> = emptyMap(), sendLocationAt: Boolean = false): String {
        require(fix.isValid) { "invalid coordinates" }
        checkExtras(extras, sendLocationAt)
        val sb = StringBuilder(96)
        sb.append("{\"location\":{\"lat\":").append(plainNumber(fix.lat))
            .append(",\"lng\":").append(plainNumber(fix.lng))
            .append(",\"v\":\"").append(VERSION).append("\"}")
        if (sendLocationAt) {
            // The instant the fix was taken, never the instant it is sent (a queued fix keeps its own).
            sb.append(",\"").append(LOCATION_AT_PROPERTY).append("\":\"").append(LocationAt.format(fix.timestamp)).append('"')
        }
        extras.forEach { (k, v) ->
            sb.append(',')
            writeString(sb, k)
            sb.append(':')
            when (v) {
                is String -> writeString(sb, v)
                is Boolean -> sb.append(if (v) "true" else "false")
                is Double -> sb.append(plainNumber(v))
                is Float -> sb.append(plainNumber(v.toString().toDouble()))
                is Number -> sb.append(v.toString())
                else -> throw IllegalArgumentException("unsupported extras value for '$k'")
            }
        }
        return sb.append('}').toString()
    }

    /**
     * Shortest plain decimal that parses back to exactly [d]: `4.0` -> `4`,
     * `0.00001` -> `0.00001` (not `1.0E-5`), `-0.0` -> `0`. Same digits as JS
     * `JSON.stringify` for the coordinate range, but never an exponent.
     */
    internal fun plainNumber(d: Double): String {
        require(d.isFinite()) { "not finite" }
        if (d == 0.0) return "0"
        val exact = BigDecimal(d)
        var shortest = exact
        for (p in 1..17) {
            val r = exact.round(MathContext(p))
            if (r.toDouble() == d) {
                shortest = r
                break
            }
        }
        val s = shortest.stripTrailingZeros()
        return (if (s.scale() < 0) s.setScale(0) else s).toPlainString()
    }

    private fun writeString(sb: StringBuilder, s: String) {
        sb.append('"')
        for (c in s) {
            when {
                c == '"' -> sb.append("\\\"")
                c == '\\' -> sb.append("\\\\")
                c == '\n' -> sb.append("\\n")
                c == '\r' -> sb.append("\\r")
                c == '\t' -> sb.append("\\t")
                c == '\b' -> sb.append("\\b")
                c == '\u000C' -> sb.append("\\f")
                c < ' ' -> sb.append(String.format("\\u%04x", c.code))
                else -> sb.append(c)
            }
        }
        sb.append('"')
    }
}
