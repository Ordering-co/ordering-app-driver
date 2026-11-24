package co.ordering.driver.location

/**
 * The `location_at` text: the instant a fix was taken, in UTC, exactly `YYYY-MM-DD HH:mm:ss`
 * (24-hour, zero-padded, ASCII digits, no `T`, no `Z`, no milliseconds, proleptic Gregorian calendar).
 *
 * Computed with integer arithmetic only: it reads no locale, no calendar, no time zone and no
 * numbering system of the device, so a phone in Arabic, with the Buddhist calendar or with
 * Eastern Arabic digits sends the same text as any other. Seconds are truncated (floor), never
 * rounded, so a fix is never dated in the future.
 */
object LocationAt {
    fun format(epochMs: Long): String {
        val totalSeconds = Math.floorDiv(epochMs, 1000L)
        val days = Math.floorDiv(totalSeconds, 86_400L)
        val secondOfDay = Math.floorMod(totalSeconds, 86_400L).toInt()
        // Civil date from days since 1970-01-01 (H. Hinnant's algorithm, proleptic Gregorian).
        val z = days + 719_468L
        val era = Math.floorDiv(z, 146_097L)
        val dayOfEra = Math.floorMod(z, 146_097L)
        val yearOfEra = (dayOfEra - dayOfEra / 1_460 + dayOfEra / 36_524 - dayOfEra / 146_096) / 365
        val dayOfYear = dayOfEra - (365 * yearOfEra + yearOfEra / 4 - yearOfEra / 100)
        val mp = (5 * dayOfYear + 2) / 153
        val day = (dayOfYear - (153 * mp + 2) / 5 + 1).toInt()
        val month = (if (mp < 10) mp + 3 else mp - 9).toInt()
        val year = yearOfEra + era * 400 + (if (month <= 2) 1 else 0)
        val sb = StringBuilder(19)
        pad(sb, year, 4).append('-')
        pad(sb, month.toLong(), 2).append('-')
        pad(sb, day.toLong(), 2).append(' ')
        pad(sb, (secondOfDay / 3600).toLong(), 2).append(':')
        pad(sb, (secondOfDay / 60 % 60).toLong(), 2).append(':')
        pad(sb, (secondOfDay % 60).toLong(), 2)
        return sb.toString()
    }

    private fun pad(sb: StringBuilder, value: Long, width: Int): StringBuilder {
        val digits = value.toString() // Long.toString is ASCII whatever the default locale
        for (i in digits.length until width) sb.append('0')
        return sb.append(digits)
    }
}
