import { Font as FontBase, parseFontFamily, FontStyle, FontWeight } from './font-common';
import { Trace } from '../../trace';
import * as fs from '../../file-system';
export * from './font-common';
export class Font extends FontBase {
    constructor(family, size, style, weight, scale) {
        super(family, size, style, weight, scale);
    }
    withFontFamily(family) {
        return new Font(family, this.fontSize, this.fontStyle, this.fontWeight, this.fontScale);
    }
    withFontStyle(style) {
        return new Font(this.fontFamily, this.fontSize, style, this.fontWeight, this.fontScale);
    }
    withFontWeight(weight) {
        return new Font(this.fontFamily, this.fontSize, this.fontStyle, weight, this.fontScale);
    }
    withFontSize(size) {
        return new Font(this.fontFamily, size, this.fontStyle, this.fontWeight, this.fontScale);
    }
    withFontScale(scale) {
        return new Font(this.fontFamily, this.fontSize, this.fontStyle, this.fontWeight, scale);
    }
    getUIFont(defaultFont) {
        return new WeakRef(NativeScriptUtils.createUIFont({
            fontFamily: parseFontFamily(this.fontFamily),
            fontSize: this.fontSize || defaultFont.pointSize,
            fontWeight: getNativeFontWeight(this.fontWeight),
            isBold: this.isBold,
            isItalic: this.isItalic,
        })).get();
    }
    getAndroidTypeface() {
        return undefined;
    }
}
Font.default = new Font(undefined, undefined, FontStyle.NORMAL, FontWeight.NORMAL, 1);
function getNativeFontWeight(fontWeight) {
    switch (fontWeight) {
        case FontWeight.THIN:
            return UIFontWeightUltraLight;
        case FontWeight.EXTRA_LIGHT:
            return UIFontWeightThin;
        case FontWeight.LIGHT:
            return UIFontWeightLight;
        case FontWeight.NORMAL:
        case '400':
        case undefined:
        case null:
            return UIFontWeightRegular;
        case FontWeight.MEDIUM:
            return UIFontWeightMedium;
        case FontWeight.SEMI_BOLD:
            return UIFontWeightSemibold;
        case FontWeight.BOLD:
        case '700':
            return UIFontWeightBold;
        case FontWeight.EXTRA_BOLD:
            return UIFontWeightHeavy;
        case FontWeight.BLACK:
            return UIFontWeightBlack;
        default:
            console.log(`Invalid font weight: "${fontWeight}"`);
    }
}
export var ios;
(function (ios) {
    function registerFont(fontFile) {
        let filePath = fs.path.join(fs.knownFolders.currentApp().path, 'fonts', fontFile);
        if (!fs.File.exists(filePath)) {
            filePath = fs.path.join(fs.knownFolders.currentApp().path, fontFile);
        }
        const fontData = NSFileManager.defaultManager.contentsAtPath(filePath);
        if (!fontData) {
            throw new Error('Could not load font from: ' + fontFile);
        }
        const provider = CGDataProviderCreateWithCFData(fontData);
        const font = CGFontCreateWithDataProvider(provider);
        if (!font) {
            throw new Error('Could not load font from: ' + fontFile);
        }
        const error = new interop.Reference();
        if (!CTFontManagerRegisterGraphicsFont(font, error)) {
            if (Trace.isEnabled()) {
                Trace.write('Error occur while registering font: ' + CFErrorCopyDescription(error.value), Trace.categories.Error, Trace.messageType.error);
            }
        }
    }
    ios.registerFont = registerFont;
})(ios || (ios = {}));
function registerFontsInFolder(fontsFolderPath) {
    const fontsFolder = fs.Folder.fromPath(fontsFolderPath);
    fontsFolder.eachEntity((fileEntity) => {
        if (fs.Folder.exists(fs.path.join(fontsFolderPath, fileEntity.name))) {
            return true;
        }
        if (fileEntity instanceof fs.File && (fileEntity.extension === '.ttf' || fileEntity.extension === '.otf')) {
            ios.registerFont(fileEntity.name);
        }
        return true;
    });
}
function registerCustomFonts() {
    const appDir = fs.knownFolders.currentApp().path;
    const fontsDir = fs.path.join(appDir, 'fonts');
    if (fs.Folder.exists(fontsDir)) {
        registerFontsInFolder(fontsDir);
    }
}
registerCustomFonts();
//# sourceMappingURL=font.ios.js.map