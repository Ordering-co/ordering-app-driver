package co.ordering.delivery.location

import android.util.Log
import co.ordering.driver.location.EventsListener

/** The log lines of the events lane (docs/LOCATION_MODULE.md, "Logs"): the same tag as the rest of the module, never an url, a header or a body. */
internal object EventsLog : EventsListener {
    private const val TAG = DriverLocationRuntime.TAG

    override fun onEventRecorded(event: String, queued: Int) {
        Log.i(TAG, "event $event queued=$queued")
    }

    override fun onEventsRequest(count: Int, queued: Int) {
        Log.i(TAG, "events request n=$count queued=$queued")
    }

    override fun onEventsHttp(status: Int, count: Int) {
        Log.i(TAG, "events http $status n=$count")
    }

    override fun onEventsRetry(delayMs: Long, status: Int?, queued: Int) {
        Log.i(TAG, "events retry in $delayMs ms (${if (status == null) "network error" else "http $status"}) queued=$queued")
    }

    override fun onEventsDropped(count: Int, why: String) {
        Log.w(TAG, "events dropped $count ($why)")
    }
}
