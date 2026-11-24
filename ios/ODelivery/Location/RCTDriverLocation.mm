#import "RCTDriverLocation.h"

#import <React/RCTBridgeModule.h>

// The app target's generated Swift header also declares `ReactNativeDelegate` (AppDelegate.swift), a
// subclass of this class: it must be visible here, as a header, because Objective-C++ takes no module import.
#import <React_RCTAppDelegate/RCTDefaultReactNativeFactoryDelegate.h>

// Swift half of the module.
#import "ODelivery-Swift.h"

@implementation RCTDriverLocation

RCT_EXPORT_MODULE(DriverLocation)

- (instancetype)init
{
  if (self = [super init]) {
    __weak RCTDriverLocation *weakSelf = self;
    [[DriverLocationBridge shared]
        attachWithOwner:self
             onLocation:^(NSDictionary<NSString *, id> *body) { [weakSelf emitOnLocation:body]; }
                 onHttp:^(NSDictionary<NSString *, id> *body) { [weakSelf emitOnHttp:body]; }
                onState:^(NSDictionary<NSString *, id> *body) { [weakSelf emitOnState:body]; }];
  }
  return self;
}

// The module is replaced when the JavaScript bundle reloads; the Swift side keeps running.
- (void)invalidate
{
  [[DriverLocationBridge shared] detachWithOwner:self];
}

- (void)dealloc
{
  [[DriverLocationBridge shared] detachWithOwner:self];
}

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeDriverLocationSpecJSI>(params);
}

- (void)configure:(JS::NativeDriverLocation::DriverLocationConfig &)config
          resolve:(RCTPromiseResolveBlock)resolve
           reject:(RCTPromiseRejectBlock)reject
{
  NSError *error = nil;
  // `interval`, `fastestInterval` and the notification texts are Android only.
  NSDictionary<NSString *, id> *state = [[DriverLocationBridge shared] configureWithUrl:config.url()
                                                                                 headers:config.headers()
                                                                                  extras:config.extras()
                                                                          distanceFilter:config.distanceFilter()
                                                                                maxQueue:config.maxQueue()
                                                                   discardOlderOnSuccess:config.discardOlderOnSuccess()
                                                                              rejectMock:config.rejectMock()
                                                                       minSendIntervalMs:config.minSendIntervalMs()
                                                                          sendLocationAt:config.sendLocationAt()
                                                                               eventsUrl:config.eventsUrl()
                                                                                   error:&error];
  if (state == nil) {
    reject(@"E_DRIVER_LOCATION_CONFIG", error.localizedDescription, nil);
    return;
  }
  resolve(state);
}

- (void)start:(NSString *)reason resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [[DriverLocationBridge shared] startWithReason:reason completion:^(NSDictionary<NSString *, id> *state) { resolve(state); }];
}

- (void)stop:(NSString *)reason resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [[DriverLocationBridge shared] stopWithReason:reason completion:^(NSDictionary<NSString *, id> *state) { resolve(state); }];
}

- (void)getState:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  resolve([[DriverLocationBridge shared] state]);
}

- (NSNumber *)setApiRoot:(NSString *)root
{
  return @([[DriverLocationBridge shared] setApiRoot:root]);
}

- (void)flush:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [[DriverLocationBridge shared] flush];
  resolve(nil);
}

@end
