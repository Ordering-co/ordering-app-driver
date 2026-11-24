package co.ordering.delivery.location

import android.app.Activity
import android.app.Application
import android.os.Bundle
import java.util.concurrent.CopyOnWriteArrayList

/**
 * Whether the app is in the foreground: at least one of its activities is started. Installed once by
 * `MainApplication`; the driver location service listens to it so the events recorder can say `app_state` and record
 * `set_app_in_background` / `set_app_in_foreground` (docs/LOCATION_MODULE.md, "Tracking events"). It only counts
 * activities (no dependency on `ProcessLifecycleOwner`); a screen rotation stops and starts the activity within a
 * moment, which the recorder's 2 s debounce swallows.
 */
object AppForeground : Application.ActivityLifecycleCallbacks {
    private var started = 0
    private val listeners = CopyOnWriteArrayList<(Boolean) -> Unit>()

    @Volatile var isForeground = false
        private set

    fun install(application: Application) {
        application.unregisterActivityLifecycleCallbacks(this)
        application.registerActivityLifecycleCallbacks(this)
    }

    /** [listener] hears every change (true = foreground), on the main thread. Returns what removes it. */
    fun listen(listener: (Boolean) -> Unit): () -> Unit {
        listeners.add(listener)
        return { listeners.remove(listener) }
    }

    @Synchronized
    private fun change(delta: Int) {
        val before = started > 0
        started = maxOf(0, started + delta)
        val now = started > 0
        isForeground = now
        if (before != now) listeners.forEach { try { it(now) } catch (_: RuntimeException) {} }
    }

    override fun onActivityStarted(activity: Activity) = change(+1)
    override fun onActivityStopped(activity: Activity) = change(-1)
    override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) {}
    override fun onActivityResumed(activity: Activity) {}
    override fun onActivityPaused(activity: Activity) {}
    override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) {}
    override fun onActivityDestroyed(activity: Activity) {}
}
