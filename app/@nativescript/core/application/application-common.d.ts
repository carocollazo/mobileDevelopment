import '../globals';
import { AndroidApplication, iOSApplication } from '.';
import { View } from '../ui/core/view';
export * from './application-interfaces';
export declare function hasLaunched(): boolean;
export declare const launchEvent = "launch";
export declare const suspendEvent = "suspend";
export declare const displayedEvent = "displayed";
export declare const backgroundEvent = "background";
export declare const foregroundEvent = "foreground";
export declare const resumeEvent = "resume";
export declare const exitEvent = "exit";
export declare const lowMemoryEvent = "lowMemory";
export declare const uncaughtErrorEvent = "uncaughtError";
export declare const discardedErrorEvent = "discardedError";
export declare const orientationChangedEvent = "orientationChanged";
export declare const systemAppearanceChangedEvent = "systemAppearanceChanged";
export declare const fontScaleChangedEvent = "fontScaleChanged";
export declare function getResources(): any;
export declare function setResources(res: any): void;
export declare const android: AndroidApplication;
export declare const ios: iOSApplication;
export declare const on: any;
export declare const off: any;
export declare const notify: any;
export declare const hasListeners: any;
export declare function setApplication(instance: iOSApplication | AndroidApplication): void;
export declare function livesync(rootView: View, context?: ModuleContext): void;
export declare function setCssFileName(cssFileName: string): void;
export declare function getCssFileName(): string;
export declare function loadAppCss(): void;
export declare function applyCssClass(rootView: View, cssClasses: string[], newCssClass: string): void;
export declare function orientationChanged(rootView: View, newOrientation: 'portrait' | 'landscape' | 'unknown'): void;
export declare let autoSystemAppearanceChanged: boolean;
export declare function setAutoSystemAppearanceChanged(value: boolean): void;
export declare function systemAppearanceChanged(rootView: View, newSystemAppearance: 'dark' | 'light'): void;
