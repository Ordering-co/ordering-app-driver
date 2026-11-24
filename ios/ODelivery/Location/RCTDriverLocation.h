#import <Foundation/Foundation.h>
#import <DriverLocationSpec/DriverLocationSpec.h>

NS_ASSUME_NONNULL_BEGIN

/// The `DriverLocation` TurboModule (codegen spec `src/native/NativeDriverLocation.ts`). A thin shell:
/// every call goes to `DriverLocationBridge` (Swift), which owns the core's `DriverLocationService`.
@interface RCTDriverLocation : NativeDriverLocationSpecBase <NativeDriverLocationSpec>
@end

NS_ASSUME_NONNULL_END
