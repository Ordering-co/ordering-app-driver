# Performance

The review made with the theme conversion (2026-11-13), which rewrote every component:
what was checked, what was fixed, and what is left. **Nothing here was profiled on a
device**: the review is a reading of the code against the original app
(`ordering-app-driver-v26`) by a read-only agent, with each fix below then checked by the
tests and by opening the app. The numbers to take on a device are in "To measure".

## Reviewed, and right

- **The theme object is stable.** `AppThemeProvider` memoizes it on the served envelope;
  `complete()` and `toNative()` run once per envelope behind a `WeakMap`
  (`src/theme/engine.ts`); nothing rebuilds it on a render or on navigation; a served
  theme equal to the cached one keeps the current object and is not written again.
- **The cache is read once, before the first frame**, with the native splash held; nothing
  in `src/theme` runs at module scope except the import of the compiled schema (49 KB).
- **Styles are built once per theme**: every component's style object is inside a
  `useMemo` keyed on the theme (about 90 call sites); there is no module-level themed
  `StyleSheet`. 289 styled-component definitions became 29, none of them in a list cell.
- **Nothing that was memoized or virtualized was lost.** Every `FlatList` of the original
  is still one; the chat library's list became an inverted, virtualized `FlatList` with
  one stylesheet for all rows; `MessageRow`, `PayoutCard` and the chat's row were added as
  memoized cells; the order row's comparator was unchanged by the conversion (the redesign extended it, see "Added by the redesign").
- **Animations use the native driver** (skeleton pulses, the toast, the image viewer's
  release); no timer was added that re-renders a list.
- **Bundled images**: 9.6 MB became 1.9 MB (the tutorial slides and the welcome
  background as JPEG), and the eager `require`s about 55 became 12.
- Tab bar icons no longer remount (the icon component is declared once); map markers
  without a picture stop tracking view changes.

## Fixed in this pass

| Area | Before | Now |
|---|---|---|
| Served images | Every logo and photo downloaded at its upload size: the SDK's `optimizeImage` returns its URL unchanged | `OAvatar` asks the image server for twice its box, as WebP (`src/utils/imageUrl.ts`, ported with its tests from the marketplace app, where it took 94 % off the logos' bytes). Not seen on a device: the pictures are behind the login |
| Startup | A single-project build cleared the stored project name, then read the cached theme: two storage calls in a row before the first frame | Both at once |
| Sessions | The list reversed the controller's array in place on every render: the order flipped on each re-render (as in the original) | A reversed copy |

## Left, by cost

Worth doing after a profile says so (none is a regression unless said):

1. **Chat: one new message re-renders every mounted bubble.** The formatting effect
   rebuilds every message object (`Chat/index.tsx`), so the memoized row never holds, and
   it parses three dates per message where the original parsed one (that part is a
   regression). Fix: cache the formatted message per raw message; carry `showDay` in the
   item. The original (the chat library) re-rendered every bubble too.
2. **`OText` allocates on every render** (a flattened style, a copy, a color object, an
   array) and is not memoized. It is the most rendered component. The original's was a
   styled text with nine interpolations, so this is not worse; a per-theme style cache
   and `React.memo` would make it cheaper.
3. **List cells build their stylesheet per instance** (`OrderItem`, `OCard`, `OAvatar`,
   `OBadge`, `FilterChip`, `OButton`): once per mounted cell, not per render. A cache per
   theme and variant would share them.
4. **Reduce motion**: read after the first frame, so a user with it on gets a second
   theme object (one full re-render) right after launch.
5. **The theme is requested twice per launch**: the request is keyed on the API root,
   which carries the language, and the language goes from `default` to its real code at
   startup. The first answer is ignored. The marketplace app does the same.
6. **Messages list**: `renderItem` and `keyExtractor` inline, and a 27-entry status list
   with 27 translations per row per render (as in the original).
7. **Driver map**: its 1 s fit interval is re-created on every render, and every marker
   re-renders on each location update (both as in the original).
8. **Order details** re-renders whole on each location update (`useLocation`, unchanged).
9. **The image cache**: `react-native-fast-image` is gone (see
   [DEPENDENCIES_PLAN.md](DEPENDENCIES_PLAN.md)); pictures use React Native's `Image`
   and the platform's HTTP cache. Whether logos are fetched or decoded again on iOS when
   a list remounts is not known.
10. **Fonts**: `Info.plist` lists 119 font files and the notification extension 36 more,
    because the 63 font files of before (Helvetica, the Inter cuts, Poppins Thin / Light)
    are still in `src/assets/fonts`. iOS registers every listed font at launch. They go
    when the owner deletes them and `npx react-native-asset` is run again.

## Added by the redesign (2026-11-18)

Read in the code, not profiled:

- **The Messages tab is built at launch**, the one tab that is not lazy (only while the theme shows it), so its list loads and
  follows the socket from the start and the tab can show the unread count (`UnreadMessagesContext`): one more API call at
  launch, accepted by the owner. That screen must never depend on being focused.
- **The unread total is a sum over the loaded pages** (`unreadTotal`), reported by the list to the tab bar; with more pages
  than loaded it is written "N+".
- **A held button animates a width with the JavaScript driver** (`HoldToConfirm`: `useNativeDriver: false`, 600 ms, only
  while the finger is down); with reduced motion it steps four times instead.
- **The order row's comparator now also compares** the business's address and the customer's name and address (the card
  writes the next stop), so a row re-renders when one of them changes. This replaces "the order row's comparator is
  unchanged" above.

## To measure

On a release build with Hermes, a mid-range Android phone and an iPhone, against the same
build of the original app:

- cold start to the first frame and to the first orders painted, with and without a
  cached theme;
- a first launch whose served theme differs from the defaults, and a launch with reduce
  motion on: commits after the first frame (React DevTools Profiler);
- the `GET theme` requests of one launch (network log);
- the orders tab: switch tabs with 10, 30 and 50 orders loaded, pull to refresh
  (`OrderItem`, `OText`, `OBadge`, `OAvatar` commit time; JS frames per second);
- the messages tab with 45 orders: scroll end to end, receive a socket update meanwhile;
- a chat of 100 or more messages: send one, receive one (rows committed), type 20
  characters (no row should commit);
- the map tab and an order's map while moving (a simulated route), with 10 or more
  markers;
- logos on iOS: scroll the lists, switch tabs and come back (flicker, repeated requests).
