import { iOSApplication as iOSApplicationDefinition } from '.';
export * from './application-common';
import { View } from '../ui/core/view';
import { NavigationEntry } from '../ui/frame/frame-interfaces';
declare class NotificationObserver extends NSObject {
    private _onReceiveCallback;
    static initWithCallback(onReceiveCallback: (notification: NSNotification) => void): NotificationObserver;
    onReceive(notification: NSNotification): void;
    static ObjCExposedMethods: {
        onReceive: {
            returns: interop.Type<void>;
            params: (typeof NSNotification)[];
        };
    };
}
export declare function setMaxRefreshRate(options?: {
    min?: number;
    max?: number;
    preferred?: number;
}): void;
export declare class iOSApplication implements iOSApplicationDefinition {
    private _backgroundColor;
    private _delegate;
    private _window;
    private _observers;
    private _orientation;
    private _rootView;
    private _systemAppearance;
    constructor();
    get orientation(): 'portrait' | 'landscape' | 'unknown';
    get rootController(): UIViewController;
    get systemAppearance(): 'light' | 'dark' | null;
    get nativeApp(): UIApplication;
    get window(): UIWindow;
    get delegate(): typeof UIApplicationDelegate;
    set delegate(value: typeof UIApplicationDelegate);
    get rootView(): View;
    addNotificationObserver(notificationName: string, onReceiveCallback: (notification: NSNotification) => void): NotificationObserver;
    removeNotificationObserver(observer: any, notificationName: string): void;
    private didFinishLaunchingWithOptions;
    notifyAppStarted(notification?: NSNotification): void;
    private didBecomeActive;
    private didEnterBackground;
    private willTerminate;
    private didChangeStatusBarOrientation;
    private didReceiveMemoryWarning;
    private getOrientationValue;
    _onLivesync(context?: ModuleContext): void;
    setWindowContent(view?: View): void;
}
declare let iosApp: iOSApplication;
export { iosApp as ios };
export declare function ensureNativeApplication(): void;
export declare function getMainEntry(): NavigationEntry;
export declare function getRootView(): View;
export declare function run(entry?: string | NavigationEntry): void;
export declare function addCss(cssText: string, attributeScoped?: boolean): void;
export declare function _resetRootView(entry?: NavigationEntry | string): void;
export declare function getNativeApplication(): UIApplication;
export declare function orientation(): 'portrait' | 'landscape' | 'unknown';
export declare function systemAppearance(): 'dark' | 'light';
export declare const AndroidApplication: any;
