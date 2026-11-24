package co.ordering.delivery

/**
 * How much of the system bars' height MainActivity keeps clear of the content. By default all of it
 * (top and bottom), so no screen draws under the status bar or the navigation bar. A screen that
 * is a photo from edge to edge (the welcome screen) asks, while it is shown, for the content to go
 * under the bars (`WindowBackground.setContentUnderBars`) and puts its own safe area back in
 * JavaScript. It is process-wide state, not the activity's: a recreated activity (a new font
 * scale) builds its listener again and must find what the screen asked for.
 */
object ContentInsets {
  @Volatile var underBars: Boolean = false

  /** The top and bottom padding of the content view for bars of these heights. */
  fun padding(top: Int, bottom: Int): Pair<Int, Int> = if (underBars) 0 to 0 else top to bottom
}
