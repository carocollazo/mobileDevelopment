import { ImageSource as ImageSourceDefinition } from '.';
import { ImageAsset } from '../image-asset';
import { Font } from '../ui/styling/font';
import { Color } from '../color';
import { isFileOrResourcePath } from '../utils';
export { isFileOrResourcePath };
export declare class ImageSource implements ImageSourceDefinition {
    android: android.graphics.Bitmap;
    ios: UIImage;
    get height(): number;
    get width(): number;
    get rotationAngle(): number;
    set rotationAngle(_value: number);
    constructor(nativeSource?: any);
    static fromAsset(asset: ImageAsset): Promise<ImageSource>;
    static fromUrl(url: string): Promise<ImageSource>;
    static fromResourceSync(name: string): ImageSource;
    static fromResource(name: string): Promise<ImageSource>;
    static fromFileSync(path: string): ImageSource;
    static fromFile(path: string): Promise<ImageSource>;
    static fromFileOrResourceSync(path: string): ImageSource;
    static fromDataSync(data: any): ImageSource;
    static fromData(data: any): Promise<ImageSource>;
    static fromBase64Sync(source: string): ImageSource;
    static fromBase64(source: string): Promise<ImageSource>;
    static fromFontIconCodeSync(source: string, font: Font, color: Color): ImageSource;
    fromAsset(asset: ImageAsset): Promise<this>;
    loadFromResource(name: string): boolean;
    fromResource(name: string): Promise<boolean>;
    loadFromFile(path: string): boolean;
    fromFile(path: string): Promise<boolean>;
    loadFromData(data: any): boolean;
    fromData(data: any): Promise<boolean>;
    loadFromBase64(source: string): boolean;
    fromBase64(source: string): Promise<boolean>;
    loadFromFontIconCode(source: string, font: Font, color: Color): boolean;
    setNativeSource(source: any): void;
    saveToFile(path: string, format: 'png' | 'jpeg' | 'jpg', quality?: number): boolean;
    saveToFileAsync(path: string, format: 'png' | 'jpeg' | 'jpg', quality?: number): Promise<boolean>;
    toBase64String(format: 'png' | 'jpeg' | 'jpg', quality?: number): string;
    toBase64StringAsync(format: 'png' | 'jpeg' | 'jpg', quality?: number): Promise<string>;
    resize(maxSize: number, options?: any): ImageSource;
    resizeAsync(maxSize: number, options?: any): Promise<ImageSource>;
}
export declare function fromAsset(asset: ImageAsset): Promise<ImageSource>;
export declare function fromResource(name: string): ImageSource;
export declare function fromFile(path: string): ImageSource;
export declare function fromData(data: any): ImageSource;
export declare function fromFontIconCode(source: string, font: Font, color: Color): ImageSource;
export declare function fromBase64(source: string): ImageSource;
export declare function fromNativeSource(nativeSource: any): ImageSource;
export declare function fromUrl(url: string): Promise<ImageSourceDefinition>;
export declare function fromFileOrResource(path: string): ImageSource;
