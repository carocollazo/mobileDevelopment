import { LinearGradient } from './linear-gradient';
import { isDataURI, isFileOrResourcePath, RESOURCE_PREFIX, FILE_PREFIX } from '../../utils';
import { parse } from '../../css-value';
import { path, knownFolders } from '../../file-system';
import * as application from '../../application';
export * from './background-common';
function fromBase64(source) {
    const bytes = android.util.Base64.decode(source, android.util.Base64.DEFAULT);
    return android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
}
function fromGradient(gradient) {
    const colors = Array.create('int', gradient.colorStops.length);
    const stops = Array.create('float', gradient.colorStops.length);
    let hasStops = false;
    gradient.colorStops.forEach((stop, index) => {
        colors[index] = stop.color.android;
        if (stop.offset) {
            stops[index] = stop.offset.value;
            hasStops = true;
        }
    });
    const alpha = gradient.angle / (Math.PI * 2);
    const startX = Math.pow(Math.sin(Math.PI * (alpha + 0.75)), 2);
    const startY = Math.pow(Math.sin(Math.PI * (alpha + 0.5)), 2);
    const endX = Math.pow(Math.sin(Math.PI * (alpha + 0.25)), 2);
    const endY = Math.pow(Math.sin(Math.PI * alpha), 2);
    return new org.nativescript.widgets.LinearGradientDefinition(startX, startY, endX, endY, colors, hasStops ? stops : null);
}
const pattern = /url\(('|")(.*?)\1\)/;
export function refreshBorderDrawable(view, borderDrawable) {
    const nativeView = view.nativeViewProtected;
    const context = nativeView.getContext();
    const background = view.style.backgroundInternal;
    if (background) {
        const backgroundPositionParsedCSSValues = createNativeCSSValueArray(background.position);
        const backgroundSizeParsedCSSValues = createNativeCSSValueArray(background.size);
        const blackColor = -16777216; //android.graphics.Color.BLACK;
        let imageUri;
        if (background.image && typeof background.image === 'string' && background.image !== 'none') {
            imageUri = background.image;
            const match = imageUri.match(pattern);
            if (match && match[2]) {
                imageUri = match[2];
            }
        }
        let bitmap = null;
        if (isDataURI(imageUri)) {
            const base64Data = imageUri.split(',')[1];
            if (base64Data !== undefined) {
                bitmap = fromBase64(base64Data);
                imageUri = null;
            }
        }
        else if (isFileOrResourcePath(imageUri)) {
            if (imageUri.indexOf(RESOURCE_PREFIX) !== 0) {
                let fileName = imageUri;
                if (fileName.indexOf('~/') === 0) {
                    fileName = path.join(knownFolders.currentApp().path, fileName.replace('~/', ''));
                }
                imageUri = FILE_PREFIX + fileName;
            }
        }
        let gradient = null;
        if (background.image && background.image instanceof LinearGradient) {
            gradient = fromGradient(background.image);
        }
        borderDrawable.refresh(background.borderTopColor ? background.borderTopColor.android : blackColor, background.borderRightColor ? background.borderRightColor.android : blackColor, background.borderBottomColor ? background.borderBottomColor.android : blackColor, background.borderLeftColor ? background.borderLeftColor.android : blackColor, background.borderTopWidth, background.borderRightWidth, background.borderBottomWidth, background.borderLeftWidth, background.borderTopLeftRadius, background.borderTopRightRadius, background.borderBottomRightRadius, background.borderBottomLeftRadius, background.clipPath, background.color ? background.color.android : 0, imageUri, bitmap, gradient, context, background.repeat, background.position, backgroundPositionParsedCSSValues, background.size, backgroundSizeParsedCSSValues);
        //console.log(`>>> ${borderDrawable.toDebugString()}`);
    }
}
function createNativeCSSValueArray(css) {
    if (!css) {
        return null;
    }
    const cssValues = parse(css);
    const nativeArray = Array.create(org.nativescript.widgets.CSSValue, cssValues.length);
    for (let i = 0, length = cssValues.length; i < length; i++) {
        nativeArray[i] = new org.nativescript.widgets.CSSValue(cssValues[i].type, cssValues[i].string, cssValues[i].unit, cssValues[i].value);
    }
    return nativeArray;
}
export var CacheMode;
(function (CacheMode) {
    CacheMode[CacheMode["none"] = 0] = "none";
    CacheMode[CacheMode["memory"] = 1] = "memory";
    CacheMode[CacheMode["diskAndMemory"] = 2] = "diskAndMemory";
})(CacheMode || (CacheMode = {}));
let currentCacheMode;
let imageFetcher;
export function initImageCache(context, mode = CacheMode.diskAndMemory, memoryCacheSize = 0.25, diskCacheSize = 10 * 1024 * 1024) {
    if (currentCacheMode === mode) {
        return;
    }
    currentCacheMode = mode;
    if (!imageFetcher) {
        imageFetcher = org.nativescript.widgets.image.Fetcher.getInstance(context);
    }
    else {
        imageFetcher.clearCache();
    }
    const params = new org.nativescript.widgets.image.Cache.CacheParams();
    params.memoryCacheEnabled = mode !== CacheMode.none;
    params.setMemCacheSizePercent(memoryCacheSize); // Set memory cache to % of app memory
    params.diskCacheEnabled = mode === CacheMode.diskAndMemory;
    params.diskCacheSize = diskCacheSize;
    const imageCache = org.nativescript.widgets.image.Cache.getInstance(params);
    imageFetcher.addImageCache(imageCache);
    imageFetcher.initCache();
}
function onLiveSync(args) {
    if (imageFetcher) {
        imageFetcher.clearCache();
    }
}
global.NativeScriptGlobals.events.on('livesync', onLiveSync);
global.NativeScriptGlobals.addEventWiring(() => {
    application.android.on('activityStarted', (args) => {
        if (!imageFetcher) {
            initImageCache(args.activity);
        }
        else {
            imageFetcher.initCache();
        }
    });
});
global.NativeScriptGlobals.addEventWiring(() => {
    application.android.on('activityStopped', (args) => {
        if (imageFetcher) {
            imageFetcher.closeCache();
        }
    });
});
//# sourceMappingURL=background.android.js.map