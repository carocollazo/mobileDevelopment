export { ad, iOSNativeHelper } from './native-helper';
export * from './utils-common';
export { Source } from './debug';
export declare function GC(): void;
export declare function releaseNativeObject(object: java.lang.Object): void;
export declare function openUrl(location: string): boolean;
/**
 * Open a file
 *
 * @param {string} filePath
 * @returns {boolean} whether opening the file succeeded or not
 */
export declare function openFile(filePath: string, title?: string): boolean;
export declare function isRealDevice(): boolean;
export declare function dismissSoftInput(nativeView?: any): void;
