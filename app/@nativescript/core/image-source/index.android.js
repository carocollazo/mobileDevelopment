// Types.
import { path as fsPath, knownFolders } from '../file-system';
import { isFileOrResourcePath, RESOURCE_PREFIX, layout } from '../utils';
import { getNativeApplication } from '../application';
import { Font } from '../ui/styling/font';
import { getScaledDimensions } from './image-source-common';
export { isFileOrResourcePath };
let http;
function ensureHttp() {
    if (!http) {
        http = require('../http');
    }
}
let application;
let resources;
function getApplication() {
    if (!application) {
        application = getNativeApplication();
    }
    return application;
}
function getResources() {
    if (!resources) {
        resources = getApplication().getResources();
    }
    return resources;
}
export class ImageSource {
    constructor(nativeSource) {
        if (nativeSource) {
            this.setNativeSource(nativeSource);
        }
    }
    get height() {
        if (this.android) {
            return this.android.getHeight();
        }
        return NaN;
    }
    get width() {
        if (this.android) {
            return this.android.getWidth();
        }
        return NaN;
    }
    get rotationAngle() {
        return this._rotationAngle;
    }
    set rotationAngle(value) {
        this._rotationAngle = value;
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
        const res = getResources();
        if (res) {
            const identifier = res.getIdentifier(name, 'drawable', getApplication().getPackageName());
            if (0 < identifier) {
                // Load BitmapDrawable with getDrawable to make use of Android internal caching
                const bitmapDrawable = res.getDrawable(identifier);
                if (bitmapDrawable && bitmapDrawable.getBitmap) {
                    return new ImageSource(bitmapDrawable.getBitmap());
                }
            }
        }
        return null;
    }
    static fromResource(name) {
        return new Promise((resolve, reject) => {
            resolve(ImageSource.fromResourceSync(name));
        });
    }
    static fromFileSync(path) {
        let fileName = typeof path === 'string' ? path.trim() : '';
        if (fileName.indexOf('~/') === 0) {
            fileName = fsPath.join(knownFolders.currentApp().path, fileName.replace('~/', ''));
        }
        const bitmap = android.graphics.BitmapFactory.decodeFile(fileName, null);
        if (bitmap) {
            const result = new ImageSource(bitmap);
            result.rotationAngle = getRotationAngleFromFile(fileName);
            return result;
        }
        else {
            return null;
        }
    }
    static fromFile(path) {
        return new Promise((resolve, reject) => {
            resolve(ImageSource.fromFileSync(path));
        });
    }
    static fromFileOrResourceSync(path) {
        if (!isFileOrResourcePath(path)) {
            throw new Error(`${path} is not a valid file or resource.`);
        }
        if (path.indexOf(RESOURCE_PREFIX) === 0) {
            return ImageSource.fromResourceSync(path.substr(RESOURCE_PREFIX.length));
        }
        return ImageSource.fromFileSync(path);
    }
    static fromDataSync(data) {
        const bitmap = android.graphics.BitmapFactory.decodeStream(data);
        return bitmap ? new ImageSource(bitmap) : null;
    }
    static fromData(data) {
        return new Promise((resolve, reject) => {
            resolve(ImageSource.fromDataSync(data));
        });
    }
    static fromBase64Sync(source) {
        let bitmap;
        if (typeof source === 'string') {
            const bytes = android.util.Base64.decode(source, android.util.Base64.DEFAULT);
            bitmap = android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        }
        return bitmap ? new ImageSource(bitmap) : null;
    }
    static fromBase64(source) {
        return new Promise((resolve, reject) => {
            resolve(ImageSource.fromBase64Sync(source));
        });
    }
    static fromFontIconCodeSync(source, font, color) {
        font = font || Font.default;
        const paint = new android.graphics.Paint();
        paint.setTypeface(font.getAndroidTypeface());
        paint.setAntiAlias(true);
        if (color) {
            paint.setColor(color.android);
        }
        let fontSize = layout.toDevicePixels(font.fontSize);
        if (!fontSize) {
            // TODO: Consider making 36 font size as default for optimal look on TabView and ActionBar
            fontSize = paint.getTextSize();
        }
        const density = layout.getDisplayDensity();
        const scaledFontSize = fontSize * density;
        paint.setTextSize(scaledFontSize);
        const textBounds = new android.graphics.Rect();
        paint.getTextBounds(source, 0, source.length, textBounds);
        const textWidth = textBounds.width();
        const textHeight = textBounds.height();
        if (textWidth > 0 && textHeight > 0) {
            const bitmap = android.graphics.Bitmap.createBitmap(textWidth, textHeight, android.graphics.Bitmap.Config.ARGB_8888);
            const canvas = new android.graphics.Canvas(bitmap);
            canvas.drawText(source, -textBounds.left, -textBounds.top, paint);
            return new ImageSource(bitmap);
        }
        return null;
    }
    fromAsset(asset) {
        console.log('fromAsset() is deprecated. Use ImageSource.fromAsset() instead.');
        return ImageSource.fromAsset(asset).then((imgSource) => {
            this.setNativeSource(imgSource.android);
            return this;
        });
    }
    loadFromResource(name) {
        console.log('fromResource() and loadFromResource() are deprecated. Use ImageSource.fromResource[Sync]() instead.');
        const imgSource = ImageSource.fromResourceSync(name);
        this.android = imgSource ? imgSource.android : null;
        return !!this.android;
    }
    fromResource(name) {
        return new Promise((resolve, reject) => {
            resolve(this.loadFromResource(name));
        });
    }
    loadFromFile(path) {
        console.log('fromFile() and loadFromFile() are deprecated. Use ImageSource.fromFile[Sync]() instead.');
        const imgSource = ImageSource.fromFileSync(path);
        this.android = imgSource ? imgSource.android : null;
        return !!this.android;
    }
    fromFile(path) {
        return new Promise((resolve, reject) => {
            resolve(this.loadFromFile(path));
        });
    }
    loadFromData(data) {
        console.log('fromData() and loadFromData() are deprecated. Use ImageSource.fromData[Sync]() instead.');
        const imgSource = ImageSource.fromDataSync(data);
        this.android = imgSource ? imgSource.android : null;
        return !!this.android;
    }
    fromData(data) {
        return new Promise((resolve, reject) => {
            resolve(this.loadFromData(data));
        });
    }
    loadFromBase64(source) {
        console.log('fromBase64() and loadFromBase64() are deprecated. Use ImageSource.fromBase64[Sync]() instead.');
        const imgSource = ImageSource.fromBase64Sync(source);
        this.android = imgSource ? imgSource.android : null;
        return !!this.android;
    }
    fromBase64(data) {
        return new Promise((resolve, reject) => {
            resolve(this.loadFromBase64(data));
        });
    }
    loadFromFontIconCode(source, font, color) {
        console.log('loadFromFontIconCode() is deprecated. Use ImageSource.fromFontIconCodeSync() instead.');
        const imgSource = ImageSource.fromFontIconCodeSync(source, font, color);
        this.android = imgSource ? imgSource.android : null;
        return !!this.android;
    }
    setNativeSource(source) {
        if (source && !(source instanceof android.graphics.Bitmap)) {
            throw new Error('The method setNativeSource() expects android.graphics.Bitmap instance.');
        }
        this.android = source;
    }
    saveToFile(path, format, quality = 100) {
        if (!this.android) {
            return false;
        }
        const targetFormat = getTargetFormat(format);
        // TODO add exception handling
        const outputStream = new java.io.BufferedOutputStream(new java.io.FileOutputStream(path));
        const res = this.android.compress(targetFormat, quality, outputStream);
        outputStream.close();
        return res;
    }
    saveToFileAsync(path, format, quality = 100) {
        return new Promise((resolve, reject) => {
            org.nativescript.widgets.Utils.saveToFileAsync(this.android, path, format, quality, new org.nativescript.widgets.Utils.AsyncImageCallback({
                onSuccess(param0) {
                    resolve(param0);
                },
                onError(param0) {
                    if (param0) {
                        reject(param0.getMessage());
                    }
                    else {
                        reject();
                    }
                },
            }));
        });
    }
    toBase64String(format, quality = 100) {
        if (!this.android) {
            return null;
        }
        const targetFormat = getTargetFormat(format);
        const outputStream = new java.io.ByteArrayOutputStream();
        const base64Stream = new android.util.Base64OutputStream(outputStream, android.util.Base64.NO_WRAP);
        this.android.compress(targetFormat, quality, base64Stream);
        base64Stream.close();
        outputStream.close();
        return outputStream.toString();
    }
    toBase64StringAsync(format, quality = 100) {
        return new Promise((resolve, reject) => {
            org.nativescript.widgets.Utils.toBase64StringAsync(this.android, format, quality, new org.nativescript.widgets.Utils.AsyncImageCallback({
                onSuccess(param0) {
                    resolve(param0);
                },
                onError(param0) {
                    if (param0) {
                        reject(param0.getMessage());
                    }
                    else {
                        reject();
                    }
                },
            }));
        });
    }
    resize(maxSize, options) {
        const dim = getScaledDimensions(this.android.getWidth(), this.android.getHeight(), maxSize);
        const bm = android.graphics.Bitmap.createScaledBitmap(this.android, dim.width, dim.height, options && options.filter);
        return new ImageSource(bm);
    }
    resizeAsync(maxSize, options) {
        return new Promise((resolve, reject) => {
            org.nativescript.widgets.Utils.resizeAsync(this.android, maxSize, JSON.stringify(options || {}), new org.nativescript.widgets.Utils.AsyncImageCallback({
                onSuccess(param0) {
                    resolve(new ImageSource(param0));
                },
                onError(param0) {
                    if (param0) {
                        reject(param0.getMessage());
                    }
                    else {
                        reject();
                    }
                },
            }));
        });
    }
}
function getTargetFormat(format) {
    switch (format) {
        case 'jpeg':
        case 'jpg':
            return android.graphics.Bitmap.CompressFormat.JPEG;
        default:
            return android.graphics.Bitmap.CompressFormat.PNG;
    }
}
function getRotationAngleFromFile(filename) {
    let result = 0;
    const ei = new android.media.ExifInterface(filename);
    const orientation = ei.getAttributeInt(android.media.ExifInterface.TAG_ORIENTATION, android.media.ExifInterface.ORIENTATION_NORMAL);
    switch (orientation) {
        case android.media.ExifInterface.ORIENTATION_ROTATE_90:
            result = 90;
            break;
        case android.media.ExifInterface.ORIENTATION_ROTATE_180:
            result = 180;
            break;
        case android.media.ExifInterface.ORIENTATION_ROTATE_270:
            result = 270;
            break;
    }
    return result;
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
//# sourceMappingURL=index.android.js.map