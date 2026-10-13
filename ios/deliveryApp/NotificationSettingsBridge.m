#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(NotificationSettings, NSObject)

RCT_EXTERN_METHOD(getAlertStyle:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(setSecureOrderProject:(NSString *)project)

@end
