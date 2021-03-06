// TODO: explain why we need to this or remov it
// Use requires to ensure order of imports is maintained
const appCommon = require('./application-common');
// First reexport so that app module is initialized.
export * from './application-common';
import { Observable } from '../data/observable';
import { profile } from '../profiling';
import { initAccessibilityCssHelper } from '../accessibility/accessibility-css-helper';
import { initAccessibilityFontScale } from '../accessibility/font-scale';
const ActivityCreated = 'activityCreated';
const ActivityDestroyed = 'activityDestroyed';
const ActivityStarted = 'activityStarted';
const ActivityPaused = 'activityPaused';
const ActivityResumed = 'activityResumed';
const ActivityStopped = 'activityStopped';
const SaveActivityState = 'saveActivityState';
const ActivityResult = 'activityResult';
const ActivityBackPressed = 'activityBackPressed';
const ActivityNewIntent = 'activityNewIntent';
const ActivityRequestPermissions = 'activityRequestPermissions';
export function setMaxRefreshRate(options) {
    // ignore on android, ios only
}
export class AndroidApplication extends Observable {
    constructor() {
        super(...arguments);
        // we are using these property to store the callbacks to avoid early GC collection which would trigger MarkReachableObjects
        this.callbacks = {};
        this._registeredReceivers = {};
        this._pendingReceiverRegistrations = new Array();
    }
    init(nativeApp) {
        if (this.nativeApp === nativeApp) {
            return;
        }
        if (this.nativeApp) {
            throw new Error('application.android already initialized.');
        }
        this.nativeApp = nativeApp;
        this.packageName = nativeApp.getPackageName();
        this.context = nativeApp.getApplicationContext();
        // we store those callbacks and add a function for clearing them later so that the objects will be eligable for GC
        this.callbacks.lifecycleCallbacks = initLifecycleCallbacks();
        this.callbacks.componentCallbacks = initComponentCallbacks();
        this.nativeApp.registerActivityLifecycleCallbacks(this.callbacks.lifecycleCallbacks);
        this.nativeApp.registerComponentCallbacks(this.callbacks.componentCallbacks);
        this._registerPendingReceivers();
    }
    _registerPendingReceivers() {
        this._pendingReceiverRegistrations.forEach((func) => func(this.context));
        this._pendingReceiverRegistrations.length = 0;
    }
    get orientation() {
        if (!this._orientation) {
            const resources = this.context.getResources();
            const configuration = resources.getConfiguration();
            this._orientation = getOrientationValue(configuration);
        }
        return this._orientation;
    }
    set orientation(value) {
        this._orientation = value;
    }
    get systemAppearance() {
        if (!this._systemAppearance) {
            const resources = this.context.getResources();
            const configuration = resources.getConfiguration();
            this._systemAppearance = getSystemAppearanceValue(configuration);
        }
        return this._systemAppearance;
    }
    set systemAppearance(value) {
        this._systemAppearance = value;
    }
    getRegisteredBroadcastReceiver(intentFilter) {
        return this._registeredReceivers[intentFilter];
    }
    registerBroadcastReceiver(intentFilter, onReceiveCallback) {
        ensureBroadCastReceiverClass();
        const registerFunc = (context) => {
            const receiver = new BroadcastReceiverClass(onReceiveCallback);
            context.registerReceiver(receiver, new android.content.IntentFilter(intentFilter));
            this._registeredReceivers[intentFilter] = receiver;
        };
        if (this.context) {
            registerFunc(this.context);
        }
        else {
            this._pendingReceiverRegistrations.push(registerFunc);
        }
    }
    unregisterBroadcastReceiver(intentFilter) {
        const receiver = this._registeredReceivers[intentFilter];
        if (receiver) {
            this.context.unregisterReceiver(receiver);
            this._registeredReceivers[intentFilter] = undefined;
            delete this._registeredReceivers[intentFilter];
        }
    }
}
AndroidApplication.activityCreatedEvent = ActivityCreated;
AndroidApplication.activityDestroyedEvent = ActivityDestroyed;
AndroidApplication.activityStartedEvent = ActivityStarted;
AndroidApplication.activityPausedEvent = ActivityPaused;
AndroidApplication.activityResumedEvent = ActivityResumed;
AndroidApplication.activityStoppedEvent = ActivityStopped;
AndroidApplication.saveActivityStateEvent = SaveActivityState;
AndroidApplication.activityResultEvent = ActivityResult;
AndroidApplication.activityBackPressedEvent = ActivityBackPressed;
AndroidApplication.activityNewIntentEvent = ActivityNewIntent;
AndroidApplication.activityRequestPermissionsEvent = ActivityRequestPermissions;
let androidApp;
export { androidApp as android };
let mainEntry;
let started = false;
export function ensureNativeApplication() {
    if (!androidApp) {
        androidApp = new AndroidApplication();
        appCommon.setApplication(androidApp);
    }
}
export function run(entry) {
    ensureNativeApplication();
    if (started) {
        throw new Error('Application is already started.');
    }
    started = true;
    mainEntry = typeof entry === 'string' ? { moduleName: entry } : entry;
    if (!androidApp.nativeApp) {
        const nativeApp = getNativeApplication();
        androidApp.init(nativeApp);
    }
    initAccessibilityCssHelper();
    initAccessibilityFontScale();
}
export function addCss(cssText, attributeScoped) {
    appCommon.notify({
        eventName: 'cssChanged',
        object: androidApp,
        cssText: cssText,
    });
    if (!attributeScoped) {
        const rootView = getRootView();
        if (rootView) {
            rootView._onCssStateChange();
        }
    }
}
const CALLBACKS = '_callbacks';
export function _resetRootView(entry) {
    ensureNativeApplication();
    const activity = androidApp.foregroundActivity || androidApp.startActivity;
    if (!activity) {
        throw new Error('Cannot find android activity.');
    }
    mainEntry = typeof entry === 'string' ? { moduleName: entry } : entry;
    const callbacks = activity[CALLBACKS];
    if (!callbacks) {
        throw new Error('Cannot find android activity callbacks.');
    }
    callbacks.resetActivityContent(activity);
}
export function getMainEntry() {
    return mainEntry;
}
export function getRootView() {
    ensureNativeApplication();
    // Use start activity as a backup when foregroundActivity is still not set
    // in cases when we are getting the root view before activity.onResumed event is fired
    const activity = androidApp.foregroundActivity || androidApp.startActivity;
    if (!activity) {
        return undefined;
    }
    const callbacks = activity[CALLBACKS];
    return callbacks ? callbacks.getRootView() : undefined;
}
export function getNativeApplication() {
    ensureNativeApplication();
    // Try getting it from module - check whether application.android.init has been explicitly called
    let nativeApp = androidApp.nativeApp;
    if (!nativeApp) {
        // check whether the com.tns.NativeScriptApplication type exists
        if (!nativeApp && com.tns.NativeScriptApplication) {
            nativeApp = com.tns.NativeScriptApplication.getInstance();
        }
        // the getInstance might return null if com.tns.NativeScriptApplication exists but is  not the starting app type
        if (!nativeApp) {
            // TODO: Should we handle the case when a custom application type is provided and the user has not explicitly initialized the application module?
            const clazz = java.lang.Class.forName('android.app.ActivityThread');
            if (clazz) {
                const method = clazz.getMethod('currentApplication', null);
                if (method) {
                    nativeApp = method.invoke(null, null);
                }
            }
        }
        // we cannot work without having the app instance
        if (!nativeApp) {
            throw new Error("Failed to retrieve native Android Application object. If you have a custom android.app.Application type implemented make sure that you've called the '<application-module>.android.init' method.");
        }
    }
    return nativeApp;
}
export function orientation() {
    ensureNativeApplication();
    return androidApp.orientation;
}
export function systemAppearance() {
    ensureNativeApplication();
    return androidApp.systemAppearance;
}
global.__onLiveSync = function __onLiveSync(context) {
    ensureNativeApplication();
    if (androidApp && androidApp.paused) {
        return;
    }
    const rootView = getRootView();
    appCommon.livesync(rootView, context);
};
function getOrientationValue(configuration) {
    const orientation = configuration.orientation;
    switch (orientation) {
        case android.content.res.Configuration.ORIENTATION_LANDSCAPE:
            return 'landscape';
        case android.content.res.Configuration.ORIENTATION_PORTRAIT:
            return 'portrait';
        default:
            return 'unknown';
    }
}
// https://developer.android.com/guide/topics/ui/look-and-feel/darktheme#configuration_changes
function getSystemAppearanceValue(configuration) {
    const systemAppearance = configuration.uiMode & android.content.res.Configuration.UI_MODE_NIGHT_MASK;
    switch (systemAppearance) {
        case android.content.res.Configuration.UI_MODE_NIGHT_YES:
            return 'dark';
        case android.content.res.Configuration.UI_MODE_NIGHT_NO:
        case android.content.res.Configuration.UI_MODE_NIGHT_UNDEFINED:
            return 'light';
    }
}
function initLifecycleCallbacks() {
    const setThemeOnLaunch = profile('setThemeOnLaunch', (activity) => {
        // Set app theme after launch screen was used during startup
        const activityInfo = activity.getPackageManager().getActivityInfo(activity.getComponentName(), android.content.pm.PackageManager.GET_META_DATA);
        if (activityInfo.metaData) {
            const setThemeOnLaunch = activityInfo.metaData.getInt('SET_THEME_ON_LAUNCH', -1);
            if (setThemeOnLaunch !== -1) {
                activity.setTheme(setThemeOnLaunch);
            }
        }
    });
    const notifyActivityCreated = profile('notifyActivityCreated', function (activity, savedInstanceState) {
        androidApp.notify({
            eventName: ActivityCreated,
            object: androidApp,
            activity,
            bundle: savedInstanceState,
        });
    });
    const subscribeForGlobalLayout = profile('subscribeForGlobalLayout', function (activity) {
        const rootView = activity.getWindow().getDecorView().getRootView();
        // store the listener not to trigger GC collection before collecting the method
        global.onGlobalLayoutListener = new android.view.ViewTreeObserver.OnGlobalLayoutListener({
            onGlobalLayout() {
                appCommon.notify({
                    eventName: appCommon.displayedEvent,
                    object: androidApp,
                    activity,
                });
                const viewTreeObserver = rootView.getViewTreeObserver();
                viewTreeObserver.removeOnGlobalLayoutListener(global.onGlobalLayoutListener);
            },
        });
        rootView.getViewTreeObserver().addOnGlobalLayoutListener(global.onGlobalLayoutListener);
    });
    let activitiesStarted = 0;
    const lifecycleCallbacks = new android.app.Application.ActivityLifecycleCallbacks({
        onActivityCreated: profile('onActivityCreated', function (activity, savedInstanceState) {
            setThemeOnLaunch(activity, undefined, undefined);
            if (!androidApp.startActivity) {
                androidApp.startActivity = activity;
            }
            notifyActivityCreated(activity, savedInstanceState, undefined);
            if (appCommon.hasListeners(appCommon.displayedEvent)) {
                subscribeForGlobalLayout(activity, undefined, undefined);
            }
        }),
        onActivityDestroyed: profile('onActivityDestroyed', function (activity) {
            if (activity === androidApp.foregroundActivity) {
                androidApp.foregroundActivity = undefined;
            }
            if (activity === androidApp.startActivity) {
                androidApp.startActivity = undefined;
            }
            androidApp.notify({
                eventName: ActivityDestroyed,
                object: androidApp,
                activity: activity,
            });
            // TODO: This is a temporary workaround to force the V8's Garbage Collector, which will force the related Java Object to be collected.
            gc();
        }),
        onActivityPaused: profile('onActivityPaused', function (activity) {
            if (activity.isNativeScriptActivity) {
                androidApp.paused = true;
                appCommon.notify({
                    eventName: appCommon.suspendEvent,
                    object: androidApp,
                    android: activity,
                });
            }
            androidApp.notify({
                eventName: ActivityPaused,
                object: androidApp,
                activity: activity,
            });
        }),
        onActivityResumed: profile('onActivityResumed', function (activity) {
            androidApp.foregroundActivity = activity;
            androidApp.notify({
                eventName: ActivityResumed,
                object: androidApp,
                activity: activity,
            });
        }),
        onActivitySaveInstanceState: profile('onActivitySaveInstanceState', function (activity, outState) {
            androidApp.notify({
                eventName: SaveActivityState,
                object: androidApp,
                activity: activity,
                bundle: outState,
            });
        }),
        onActivityStarted: profile('onActivityStarted', function (activity) {
            activitiesStarted++;
            if (activitiesStarted === 1) {
                androidApp.backgrounded = true;
                appCommon.notify({
                    eventName: appCommon.foregroundEvent,
                    object: androidApp,
                    android: activity,
                });
            }
            androidApp.notify({
                eventName: ActivityStarted,
                object: androidApp,
                activity: activity,
            });
        }),
        onActivityStopped: profile('onActivityStopped', function (activity) {
            activitiesStarted--;
            if (activitiesStarted === 0) {
                androidApp.backgrounded = true;
                appCommon.notify({
                    eventName: appCommon.backgroundEvent,
                    object: androidApp,
                    android: activity,
                });
            }
            androidApp.notify({
                eventName: ActivityStopped,
                object: androidApp,
                activity: activity,
            });
        }),
    });
    return lifecycleCallbacks;
}
function initComponentCallbacks() {
    const componentCallbacks = new android.content.ComponentCallbacks2({
        onLowMemory: profile('onLowMemory', function () {
            gc();
            java.lang.System.gc();
            appCommon.notify({
                eventName: appCommon.lowMemoryEvent,
                object: this,
                android: this,
            });
        }),
        onTrimMemory: profile('onTrimMemory', function (level) {
            // TODO: This is skipped for now, test carefully for OutOfMemory exceptions
        }),
        onConfigurationChanged: profile('onConfigurationChanged', function (newConfiguration) {
            const rootView = getRootView();
            const newOrientation = getOrientationValue(newConfiguration);
            if (androidApp.orientation !== newOrientation) {
                androidApp.orientation = newOrientation;
                appCommon.orientationChanged(rootView, newOrientation);
                appCommon.notify({
                    eventName: appCommon.orientationChangedEvent,
                    android: androidApp.nativeApp,
                    newValue: androidApp.orientation,
                    object: androidApp,
                });
                return;
            }
            const newSystemAppearance = getSystemAppearanceValue(newConfiguration);
            if (androidApp.systemAppearance !== newSystemAppearance) {
                androidApp.systemAppearance = newSystemAppearance;
                appCommon.systemAppearanceChanged(rootView, newSystemAppearance);
                appCommon.notify({
                    eventName: appCommon.systemAppearanceChangedEvent,
                    android: androidApp.nativeApp,
                    newValue: androidApp.systemAppearance,
                    object: androidApp,
                });
            }
        }),
    });
    return componentCallbacks;
}
let BroadcastReceiverClass;
function ensureBroadCastReceiverClass() {
    if (BroadcastReceiverClass) {
        return;
    }
    var BroadcastReceiver = /** @class */ (function (_super) {
    __extends(BroadcastReceiver, _super);
    function BroadcastReceiver(onReceiveCallback) {
        var _this = _super.call(this) || this;
        _this._onReceiveCallback = onReceiveCallback;
        return global.__native(_this);
    }
    BroadcastReceiver.prototype.onReceive = function (context, intent) {
        if (this._onReceiveCallback) {
            this._onReceiveCallback(context, intent);
        }
    };
    return BroadcastReceiver;
}(android.content.BroadcastReceiver));
    BroadcastReceiverClass = BroadcastReceiver;
}
// core exports this symbol so apps may import them in general
// technically they are only available for use when running that platform
// helps avoid a webpack nonexistent warning
export const iOSApplication = undefined;
//# sourceMappingURL=index.android.js.map