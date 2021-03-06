import { AndroidApplication as AndroidApplicationDefinition } from '.';
import { AndroidActivityBackPressedEventData, AndroidActivityBundleEventData, AndroidActivityEventData, AndroidActivityNewIntentEventData, AndroidActivityRequestPermissionsEventData, AndroidActivityResultEventData } from './application-interfaces';
export * from './application-common';
import { View } from '../ui/core/view';
import { NavigationEntry } from '../ui/frame/frame-interfaces';
import { Observable } from '../data/observable';
export declare function setMaxRefreshRate(options?: {
    min?: number;
    max?: number;
    preferred?: number;
}): void;
export declare class AndroidApplication extends Observable implements AndroidApplicationDefinition {
    static activityCreatedEvent: string;
    static activityDestroyedEvent: string;
    static activityStartedEvent: string;
    static activityPausedEvent: string;
    static activityResumedEvent: string;
    static activityStoppedEvent: string;
    static saveActivityStateEvent: string;
    static activityResultEvent: string;
    static activityBackPressedEvent: string;
    static activityNewIntentEvent: string;
    static activityRequestPermissionsEvent: string;
    private _orientation;
    private _systemAppearance;
    paused: boolean;
    backgrounded: boolean;
    nativeApp: android.app.Application;
    /**
     * @deprecated Use Utils.android.getApplicationContext() instead.
     */
    context: android.content.Context;
    foregroundActivity: androidx.appcompat.app.AppCompatActivity;
    startActivity: androidx.appcompat.app.AppCompatActivity;
    /**
     * @deprecated Use Utils.android.getPackageName() instead.
     */
    packageName: string;
    private callbacks;
    init(nativeApp: android.app.Application): void;
    private _registeredReceivers;
    private _pendingReceiverRegistrations;
    private _registerPendingReceivers;
    get orientation(): 'portrait' | 'landscape' | 'unknown';
    set orientation(value: 'portrait' | 'landscape' | 'unknown');
    get systemAppearance(): 'light' | 'dark';
    set systemAppearance(value: 'light' | 'dark');
    getRegisteredBroadcastReceiver(intentFilter: string): android.content.BroadcastReceiver | undefined;
    registerBroadcastReceiver(intentFilter: string, onReceiveCallback: (context: android.content.Context, intent: android.content.Intent) => void): void;
    unregisterBroadcastReceiver(intentFilter: string): void;
}
export interface AndroidApplication {
    on(eventNames: string, callback: (data: AndroidActivityEventData) => void, thisArg?: any): any;
    on(event: 'activityCreated', callback: (args: AndroidActivityBundleEventData) => void, thisArg?: any): any;
    on(event: 'activityDestroyed', callback: (args: AndroidActivityEventData) => void, thisArg?: any): any;
    on(event: 'activityStarted', callback: (args: AndroidActivityEventData) => void, thisArg?: any): any;
    on(event: 'activityPaused', callback: (args: AndroidActivityEventData) => void, thisArg?: any): any;
    on(event: 'activityResumed', callback: (args: AndroidActivityEventData) => void, thisArg?: any): any;
    on(event: 'activityStopped', callback: (args: AndroidActivityEventData) => void, thisArg?: any): any;
    on(event: 'saveActivityState', callback: (args: AndroidActivityBundleEventData) => void, thisArg?: any): any;
    on(event: 'activityResult', callback: (args: AndroidActivityResultEventData) => void, thisArg?: any): any;
    on(event: 'activityBackPressed', callback: (args: AndroidActivityBackPressedEventData) => void, thisArg?: any): any;
    on(event: 'activityNewIntent', callback: (args: AndroidActivityNewIntentEventData) => void, thisArg?: any): any;
    on(event: 'activityRequestPermissions', callback: (args: AndroidActivityRequestPermissionsEventData) => void, thisArg?: any): any;
}
declare let androidApp: AndroidApplication;
export { androidApp as android };
export declare function ensureNativeApplication(): void;
export declare function run(entry?: NavigationEntry | string): void;
export declare function addCss(cssText: string, attributeScoped?: boolean): void;
export declare function _resetRootView(entry?: NavigationEntry | string): void;
export declare function getMainEntry(): NavigationEntry;
export declare function getRootView(): View;
export declare function getNativeApplication(): android.app.Application;
export declare function orientation(): 'portrait' | 'landscape' | 'unknown';
export declare function systemAppearance(): 'dark' | 'light';
export declare const iOSApplication: any;
