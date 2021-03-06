/* tslint:disable:class-name */
import { getNativeApplication, on, orientationChangedEvent, android as AndroidApplication } from '../application';
const MIN_TABLET_PIXELS = 600;
export const platformNames = {
    android: 'Android',
    ios: 'iOS',
};
class MainScreen {
    reinitMetrics() {
        if (!this._metrics) {
            this._metrics = new android.util.DisplayMetrics();
        }
        this.initMetrics();
    }
    initMetrics() {
        const nativeApp = getNativeApplication();
        nativeApp.getSystemService(android.content.Context.WINDOW_SERVICE).getDefaultDisplay().getRealMetrics(this._metrics);
    }
    get metrics() {
        if (!this._metrics) {
            // NOTE: This will be memory leak but we MainScreen is singleton
            on('cssChanged', this.reinitMetrics, this);
            on(orientationChangedEvent, this.reinitMetrics, this);
            this._metrics = new android.util.DisplayMetrics();
            this.initMetrics();
        }
        return this._metrics;
    }
    get widthPixels() {
        return this.metrics.widthPixels;
    }
    get heightPixels() {
        return this.metrics.heightPixels;
    }
    get scale() {
        return this.metrics.density;
    }
    get widthDIPs() {
        return this.metrics.widthPixels / this.metrics.density;
    }
    get heightDIPs() {
        return this.metrics.heightPixels / this.metrics.density;
    }
}
export class Screen {
}
Screen.mainScreen = new MainScreen();
// This retains compatibility with NS6
export const screen = Screen;
class DeviceRef {
    get manufacturer() {
        if (!this._manufacturer) {
            this._manufacturer = android.os.Build.MANUFACTURER;
        }
        return this._manufacturer;
    }
    get os() {
        return platformNames.android;
    }
    get osVersion() {
        if (!this._osVersion) {
            this._osVersion = android.os.Build.VERSION.RELEASE;
        }
        return this._osVersion;
    }
    get model() {
        if (!this._model) {
            this._model = android.os.Build.MODEL;
        }
        return this._model;
    }
    get sdkVersion() {
        if (!this._sdkVersion) {
            this._sdkVersion = android.os.Build.VERSION.SDK;
        }
        return this._sdkVersion;
    }
    get deviceType() {
        if (!this._deviceType) {
            const dips = Math.min(Screen.mainScreen.widthPixels, Screen.mainScreen.heightPixels) / Screen.mainScreen.scale;
            // If the device has more than 600 dips it is considered to be a tablet.
            if (dips >= MIN_TABLET_PIXELS) {
                this._deviceType = 'Tablet';
            }
            else {
                this._deviceType = 'Phone';
            }
        }
        return this._deviceType;
    }
    get uuid() {
        if (!this._uuid) {
            const nativeApp = AndroidApplication.nativeApp;
            this._uuid = android.provider.Settings.Secure.getString(nativeApp.getContentResolver(), android.provider.Settings.Secure.ANDROID_ID);
        }
        return this._uuid;
    }
    get language() {
        return java.util.Locale.getDefault().getLanguage().replace('_', '-');
    }
    get region() {
        return java.util.Locale.getDefault().getCountry();
    }
}
export const Device = new DeviceRef();
// This retains compatibility with NS6
export const device = Device;
export const isAndroid = global.isAndroid;
export const isIOS = global.isIOS;
//# sourceMappingURL=index.android.js.map