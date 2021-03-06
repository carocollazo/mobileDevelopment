export declare const platformNames: {
    android: string;
    ios: string;
};
declare class MainScreen {
    private _metrics;
    private reinitMetrics;
    private initMetrics;
    private get metrics();
    get widthPixels(): number;
    get heightPixels(): number;
    get scale(): number;
    get widthDIPs(): number;
    get heightDIPs(): number;
}
export declare class Screen {
    static mainScreen: MainScreen;
}
export declare const screen: typeof Screen;
declare class DeviceRef {
    private _manufacturer;
    private _model;
    private _osVersion;
    private _sdkVersion;
    private _deviceType;
    private _uuid;
    get manufacturer(): string;
    get os(): string;
    get osVersion(): string;
    get model(): string;
    get sdkVersion(): string;
    get deviceType(): 'Phone' | 'Tablet';
    get uuid(): string;
    get language(): string;
    get region(): string;
}
export declare const Device: DeviceRef;
export declare const device: DeviceRef;
export declare const isAndroid: boolean;
export declare const isIOS: boolean;
export {};
