export declare const platformNames: {
    android: string;
    ios: string;
};
declare class DeviceRef {
    private _model;
    private _osVersion;
    private _sdkVersion;
    private _deviceType;
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
declare class MainScreen {
    private _screen;
    private get screen();
    get widthPixels(): number;
    get heightPixels(): number;
    get scale(): number;
    get widthDIPs(): number;
    get heightDIPs(): number;
}
export declare const Device: DeviceRef;
export declare const device: DeviceRef;
export declare class Screen {
    static mainScreen: MainScreen;
}
export declare const screen: typeof Screen;
export declare const isAndroid: boolean;
export declare const isIOS: boolean;
export {};
