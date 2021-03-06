import { Font } from '../ui/styling/font';
import { Trace } from '../trace';
// Types.
import { path as fsPath, knownFolders } from '../file-system';
import { isFileOrResourcePath, RESOURCE_PREFIX, layout } from '../utils';
import { getScaledDimensions } from './image-source-common';
export { isFileOrResourcePath };
let http;
function ensureHttp() {
    if (!http) {
        http = require('../http');
    }
}
export class ImageSource {
    constructor(nativeSource) {
        if (nativeSource) {
            this.setNativeSource(nativeSource);
        }
    }
    get height() {
        if (this.ios) {
            return this.ios.size.height;
        }
        return NaN;
    }
    get width() {
        if (this.ios) {
            return this.ios.size.width;
        }
        return NaN;
    }
    get rotationAngle() {
        return NaN;
    }
    set rotationAngle(_value) {
        // compatibility with Android
    }
    static fromAsset(asset) {
        return new Promise((resolve, reject) => {
            asset.getImageAsync((image, err) => {
                if (image) {
                    resolve(new ImageSource(image));
                }
                else {
                    reject(err);
                }
            });
        });
    }
    static fromUrl(url) {
        ensureHttp();
        return http.getImage(url);
    }
    static fromResourceSync(name) {
        const nativeSource = UIImage.tns_safeImageNamed(name) || UIImage.tns_safeImageNamed(`${name}.jpg`);
        return nativeSource ? new ImageSource(nativeSource) : null;
    }
    static fromResource(name) {
        return new Promise((resolve, reject) => {
            try {
                UIImage.tns_safeDecodeImageNamedCompletion(name, (image) => {
                    if (image) {
                        resolve(new ImageSource(image));
                    }
                    else {
                        UIImage.tns_safeDecodeImageNamedCompletion(`${name}.jpg`, (img) => {
                            if (img) {
                                resolve(new ImageSource(img));
                            }
                        });
                    }
                });
            }
            catch (ex) {
                reject(ex);
            }
        });
    }
    static fromFileSync(path) {
        const uiImage = UIImage.imageWithContentsOfFile(getFileName(path));
        return uiImage ? new ImageSource(uiImage) : null;
    }
    static fromFile(path) {
        return new Promise((resolve, reject) => {
            try {
                UIImage.tns_decodeImageWidthContentsOfFileCompletion(getFileName(path), (uiImage) => {
                    if (uiImage) {
                        resolve(new ImageSource(uiImage));
                    }
                });
            }
            catch (ex) {
                reject(ex);
            }
        });
    }
    static fromFileOrResourceSync(path) {
        if (!isFileOrResourcePath(path)) {
            if (Trace.isEnabled()) {
                Trace.write('Path "' + path + '" is not a valid file or resource.', Trace.categories.Binding, Trace.messageType.error);
            }
            return null;
        }
        if (path.indexOf(RESOURCE_PREFIX) === 0) {
            return ImageSource.fromResourceSync(path.substr(RESOURCE_PREFIX.length));
        }
        return ImageSource.fromFileSync(path);
    }
    static fromDataSync(data) {
        const uiImage = UIImage.imageWithData(data);
        return uiImage ? new ImageSource(uiImage) : null;
    }
    static fromData(data) {
        return new Promise((resolve, reject) => {
            try {
                UIImage.tns_decodeImageWithDataCompletion(data, (uiImage) => {
                    if (uiImage) {
                        resolve(new ImageSource(uiImage));
                    }
                });
            }
            catch (ex) {
                reject(ex);
            }
        });
    }
    static fromBase64Sync(source) {
        let uiImage;
        if (typeof source === 'string') {
            const data = NSData.alloc().initWithBase64EncodedStringOptions(source, 1 /* IgnoreUnknownCharacters */);
            uiImage = UIImage.imageWithData(data);
        }
        return uiImage ? new ImageSource(uiImage) : null;
    }
    static fromBase64(source) {
        return new Promise((resolve, reject) => {
            try {
                const data = NSData.alloc().initWithBase64EncodedStringOptions(source, 1 /* IgnoreUnknownCharacters */);
                const main_queue = dispatch_get_current_queue();
                const background_queue = dispatch_get_global_queue(21 /* QOS_CLASS_DEFAULT */, 0);
                dispatch_async(background_queue, () => {
                    const uiImage = UIImage.imageWithData(data);
                    dispatch_async(main_queue, () => {
                        resolve(new ImageSource(uiImage));
                    });
                });
            }
            catch (ex) {
                reject(ex);
            }
        });
    }
    static fromFontIconCodeSync(source, font, color) {
        font = font || Font.default;
        let fontSize = layout.toDevicePixels(font.fontSize);
        if (!fontSize) {
            // TODO: Consider making 36 font size as default for optimal look on TabView and ActionBar
            fontSize = UIFont.labelFontSize;
        }
        const density = layout.getDisplayDensity();
        const scaledFontSize = fontSize * density;
        const attributes = {
            [NSFontAttributeName]: font.getUIFont(UIFont.systemFontOfSize(scaledFontSize)),
        };
        if (color) {
            attributes[NSForegroundColorAttributeName] = color.ios;
        }
        const attributedString = NSAttributedString.alloc().initWithStringAttributes(source, attributes);
        UIGraphicsBeginImageContextWithOptions(attributedString.size(), false, 0.0);
        attributedString.drawAtPoint(CGPointMake(0, 0));
        const iconImage = UIGraphicsGetImageFromCurrentImageContext();
        UIGraphicsEndImageContext();
        return iconImage ? new ImageSource(iconImage) : null;
    }
    fromAsset(asset) {
        console.log('fromAsset() is deprecated. Use ImageSource.fromAsset() instead.');
        return ImageSource.fromAsset(asset).then((imgSource) => {
            this.setNativeSource(imgSource.ios);
            return this;
        });
    }
    loadFromResource(name) {
        console.log('loadFromResource() is deprecated. Use ImageSource.fromResourceSync() instead.');
        const imgSource = ImageSource.fromResourceSync(name);
        this.ios = imgSource ? imgSource.ios : null;
        return !!this.ios;
    }
    fromResource(name) {
        console.log('fromResource() is deprecated. Use ImageSource.fromResource() instead.');
        return ImageSource.fromResource(name).then((imgSource) => {
            this.ios = imgSource.ios;
            return !!this.ios;
        });
    }
    loadFromFile(path) {
        console.log('loadFromFile() is deprecated. Use ImageSource.fromFileSync() instead.');
        const imgSource = ImageSource.fromFileSync(path);
        this.ios = imgSource ? imgSource.ios : null;
        return !!this.ios;
    }
    fromFile(path) {
        console.log('fromFile() is deprecated. Use ImageSource.fromFile() instead.');
        return ImageSource.fromFile(path).then((imgSource) => {
            this.ios = imgSource.ios;
            return !!this.ios;
        });
    }
    loadFromData(data) {
        console.log('loadFromData() is deprecated. Use ImageSource.fromDataSync() instead.');
        const imgSource = ImageSource.fromDataSync(data);
        this.ios = imgSource ? imgSource.ios : null;
        return !!this.ios;
    }
    fromData(data) {
        console.log('fromData() is deprecated. Use ImageSource.fromData() instead.');
        return ImageSource.fromData(data).then((imgSource) => {
            this.ios = imgSource.ios;
            return !!this.ios;
        });
    }
    loadFromBase64(source) {
        console.log('loadFromBase64() is deprecated. Use ImageSource.fromBase64Sync() instead.');
        const imgSource = ImageSource.fromBase64Sync(source);
        this.ios = imgSource ? imgSource.ios : null;
        return !!this.ios;
    }
    fromBase64(source) {
        console.log('fromBase64() is deprecated. Use ImageSource.fromBase64() instead.');
        return ImageSource.fromBase64(source).then((imgSource) => {
            this.ios = imgSource.ios;
            return !!this.ios;
        });
    }
    loadFromFontIconCode(source, font, color) {
        console.log('loadFromFontIconCode() is deprecated. Use ImageSource.fromFontIconCodeSync() instead.');
        const imgSource = ImageSource.fromFontIconCodeSync(source, font, color);
        this.ios = imgSource ? imgSource.ios : null;
        return !!this.ios;
    }
    setNativeSource(source) {
        if (source && !(source instanceof UIImage)) {
            if (Trace.isEnabled()) {
                Trace.write('The method setNativeSource() expects UIImage instance.', Trace.categories.Binding, Trace.messageType.error);
            }
            return;
        }
        this.ios = source;
    }
    saveToFile(path, format, quality) {
        if (!this.ios) {
            return false;
        }
        if (quality) {
            quality = (quality - 0) / (100 - 0); // Normalize quality on a scale of 0 to 1
        }
        const data = getImageData(this.ios, format, quality);
        if (data) {
            return NSFileManager.defaultManager.createFileAtPathContentsAttributes(path, data, null);
        }
        return false;
    }
    saveToFileAsync(path, format, quality) {
        return new Promise((resolve, reject) => {
            if (!this.ios) {
                reject(false);
            }
            let isSuccess = false;
            try {
                if (quality) {
                    quality = (quality - 0) / (100 - 0); // Normalize quality on a scale of 0 to 1
                }
                const main_queue = dispatch_get_current_queue();
                const background_queue = dispatch_get_global_queue(21 /* QOS_CLASS_DEFAULT */, 0);
                dispatch_async(background_queue, () => {
                    const data = getImageData(this.ios, format, quality);
                    if (data) {
                        isSuccess = NSFileManager.defaultManager.createFileAtPathContentsAttributes(path, data, null);
                    }
                    dispatch_async(main_queue, () => {
                        resolve(isSuccess);
                    });
                });
            }
            catch (ex) {
                reject(ex);
            }
        });
    }
    toBase64String(format, quality) {
        let res = null;
        if (!this.ios) {
            return res;
        }
        if (quality) {
            quality = (quality - 0) / (100 - 0); // Normalize quality on a scale of 0 to 1
        }
        const data = getImageData(this.ios, format, quality);
        if (data) {
            res = data.base64Encoding();
        }
        return res;
    }
    toBase64StringAsync(format, quality) {
        return new Promise((resolve, reject) => {
            if (!this.ios) {
                reject(null);
            }
            let result = null;
            try {
                if (quality) {
                    quality = (quality - 0) / (100 - 0); // Normalize quality on a scale of 0 to 1
                }
                const main_queue = dispatch_get_current_queue();
                const background_queue = dispatch_get_global_queue(21 /* QOS_CLASS_DEFAULT */, 0);
                dispatch_async(background_queue, () => {
                    const data = getImageData(this.ios, format, quality);
                    if (data) {
                        result = data.base64Encoding();
                    }
                    dispatch_async(main_queue, () => {
                        resolve(result);
                    });
                });
            }
            catch (ex) {
                reject(ex);
            }
        });
    }
    resize(maxSize, options) {
        var _a;
        const size = this.ios.size;
        const dim = getScaledDimensions(size.width, size.height, maxSize);
        const newSize = CGSizeMake(dim.width, dim.height);
        UIGraphicsBeginImageContextWithOptions(newSize, (_a = options === null || options === void 0 ? void 0 : options.opaque) !== null && _a !== void 0 ? _a : false, this.ios.scale);
        this.ios.drawInRect(CGRectMake(0, 0, newSize.width, newSize.height));
        const resizedImage = UIGraphicsGetImageFromCurrentImageContext();
        UIGraphicsEndImageContext();
        return new ImageSource(resizedImage);
    }
    resizeAsync(maxSize, options) {
        return new Promise((resolve, reject) => {
            if (!this.ios) {
                reject(null);
            }
            const main_queue = dispatch_get_current_queue();
            const background_queue = dispatch_get_global_queue(21 /* QOS_CLASS_DEFAULT */, 0);
            dispatch_async(background_queue, () => {
                var _a;
                const size = this.ios.size;
                const dim = getScaledDimensions(size.width, size.height, maxSize);
                const newSize = CGSizeMake(dim.width, dim.height);
                UIGraphicsBeginImageContextWithOptions(newSize, (_a = options === null || options === void 0 ? void 0 : options.opaque) !== null && _a !== void 0 ? _a : false, this.ios.scale);
                this.ios.drawInRect(CGRectMake(0, 0, newSize.width, newSize.height));
                const resizedImage = UIGraphicsGetImageFromCurrentImageContext();
                UIGraphicsEndImageContext();
                dispatch_async(main_queue, () => {
                    resolve(new ImageSource(resizedImage));
                });
            });
        });
    }
}
function getFileName(path) {
    let fileName = typeof path === 'string' ? path.trim() : '';
    if (fileName.indexOf('~/') === 0) {
        fileName = fsPath.join(knownFolders.currentApp().path, fileName.replace('~/', ''));
    }
    return fileName;
}
function getImageData(instance, format, quality = 0.9) {
    return NativeScriptUtils.getImageDataFormatQuality(instance, format, quality);
}
export function fromAsset(asset) {
    console.log('fromAsset() is deprecated. Use ImageSource.fromAsset() instead.');
    return ImageSource.fromAsset(asset);
}
export function fromResource(name) {
    console.log('fromResource() is deprecated. Use ImageSource.fromResourceSync() instead.');
    return ImageSource.fromResourceSync(name);
}
export function fromFile(path) {
    console.log('fromFile() is deprecated. Use ImageSource.fromFileSync() instead.');
    return ImageSource.fromFileSync(path);
}
export function fromData(data) {
    console.log('fromData() is deprecated. Use ImageSource.fromDataSync() instead.');
    return ImageSource.fromDataSync(data);
}
export function fromFontIconCode(source, font, color) {
    console.log('fromFontIconCode() is deprecated. Use ImageSource.fromFontIconCodeSync() instead.');
    return ImageSource.fromFontIconCodeSync(source, font, color);
}
export function fromBase64(source) {
    console.log('fromBase64() is deprecated. Use ImageSource.fromBase64Sync() instead.');
    return ImageSource.fromBase64Sync(source);
}
export function fromNativeSource(nativeSource) {
    console.log('fromNativeSource() is deprecated. Use ImageSource constructor instead.');
    return new ImageSource(nativeSource);
}
export function fromUrl(url) {
    console.log('fromUrl() is deprecated. Use ImageSource.fromUrl() instead.');
    return ImageSource.fromUrl(url);
}
export function fromFileOrResource(path) {
    console.log('fromFileOrResource() is deprecated. Use ImageSource.fromFileOrResourceSync() instead.');
    return ImageSource.fromFileOrResourceSync(path);
}
//# sourceMappingURL=index.ios.js.map