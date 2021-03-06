// Types
import { getClosestPropertyValue } from './text-base-common';
// Requires
import { Font } from '../styling/font';
import { TextBaseCommon, textProperty, formattedTextProperty, textAlignmentProperty, textDecorationProperty, textTransformProperty, textShadowProperty, letterSpacingProperty, lineHeightProperty, resetSymbol } from './text-base-common';
import { Color } from '../../color';
import { Span } from './span';
import { colorProperty, fontInternalProperty, Length } from '../styling/style-properties';
import { isString, isNullOrUndefined } from '../../utils/types';
import { iOSNativeHelper } from '../../utils';
import { Trace } from '../../trace';
export * from './text-base-common';
const majorVersion = iOSNativeHelper.MajorVersion;
var UILabelClickHandlerImpl = /** @class */ (function (_super) {
    __extends(UILabelClickHandlerImpl, _super);
    function UILabelClickHandlerImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    UILabelClickHandlerImpl.initWithOwner = function (owner) {
        var handler = UILabelClickHandlerImpl.new();
        handler._owner = owner;
        return handler;
    };
    UILabelClickHandlerImpl.prototype.linkTap = function (tapGesture) {
        var owner = this._owner.get();
        if (owner) {
            // https://stackoverflow.com/a/35789589
            var label = owner.nativeTextViewProtected;
            var layoutManager = NSLayoutManager.alloc().init();
            var textContainer = NSTextContainer.alloc().initWithSize(CGSizeZero);
            var textStorage = NSTextStorage.alloc().initWithAttributedString(owner.nativeTextViewProtected['attributedText']);
            layoutManager.addTextContainer(textContainer);
            textStorage.addLayoutManager(layoutManager);
            textContainer.lineFragmentPadding = 0;
            textContainer.lineBreakMode = label.lineBreakMode;
            textContainer.maximumNumberOfLines = label.numberOfLines;
            var labelSize = label.bounds.size;
            textContainer.size = labelSize;
            var locationOfTouchInLabel = tapGesture.locationInView(label);
            var textBoundingBox = layoutManager.usedRectForTextContainer(textContainer);
            var textContainerOffset = CGPointMake((labelSize.width - textBoundingBox.size.width) * 0.5 - textBoundingBox.origin.x, (labelSize.height - textBoundingBox.size.height) * 0.5 - textBoundingBox.origin.y);
            var locationOfTouchInTextContainer = CGPointMake(locationOfTouchInLabel.x - textContainerOffset.x, locationOfTouchInLabel.y - textContainerOffset.y);
            var indexOfCharacter = layoutManager.characterIndexForPointInTextContainerFractionOfDistanceBetweenInsertionPoints(locationOfTouchInTextContainer, textContainer, null);
            var span = null;
            // try to find the corresponding span using the spanRanges
            for (var i = 0; i < owner._spanRanges.length; i++) {
                var range = owner._spanRanges[i];
                if (range.location <= indexOfCharacter && range.location + range.length > indexOfCharacter) {
                    if (owner.formattedText && owner.formattedText.spans.length > i) {
                        span = owner.formattedText.spans.getItem(i);
                    }
                    break;
                }
            }
            if (span && span.tappable) {
                // if the span is found and tappable emit the linkTap event
                span._emit(Span.linkTapEvent);
            }
        }
    };
    UILabelClickHandlerImpl.ObjCExposedMethods = {
        linkTap: { returns: interop.types.void, params: [interop.types.id] },
    };
    return UILabelClickHandlerImpl;
}(NSObject));
export class TextBase extends TextBaseCommon {
    constructor() {
        super(...arguments);
        this._tappable = false;
    }
    initNativeView() {
        super.initNativeView();
        this._setTappableState(false);
    }
    _setTappableState(tappable) {
        if (this._tappable !== tappable) {
            this._tappable = tappable;
            if (this._tappable) {
                const tapHandler = UILabelClickHandlerImpl.initWithOwner(new WeakRef(this));
                // associate handler with menuItem or it will get collected by JSC.
                this.handler = tapHandler;
                this._tapGestureRecognizer = UITapGestureRecognizer.alloc().initWithTargetAction(tapHandler, 'linkTap');
                this.nativeViewProtected.userInteractionEnabled = true;
                this.nativeViewProtected.addGestureRecognizer(this._tapGestureRecognizer);
            }
            else {
                this.nativeViewProtected.userInteractionEnabled = false;
                this.nativeViewProtected.removeGestureRecognizer(this._tapGestureRecognizer);
            }
        }
    }
    [textProperty.getDefault]() {
        return resetSymbol;
    }
    [textProperty.setNative](value) {
        const reset = value === resetSymbol;
        if (!reset && this.formattedText) {
            return;
        }
        this._setNativeText(reset);
        this._requestLayoutOnTextChanged();
    }
    [formattedTextProperty.setNative](value) {
        this._setNativeText();
        this._setTappableState(isStringTappable(value));
        textProperty.nativeValueChange(this, !value ? '' : value.toString());
        this._requestLayoutOnTextChanged();
    }
    [colorProperty.getDefault]() {
        const nativeView = this.nativeTextViewProtected;
        if (nativeView instanceof UIButton) {
            return nativeView.titleColorForState(0 /* Normal */);
        }
        else {
            return nativeView.textColor;
        }
    }
    [colorProperty.setNative](value) {
        const color = value instanceof Color ? value.ios : value;
        this._setColor(color);
    }
    [fontInternalProperty.getDefault]() {
        let nativeView = this.nativeTextViewProtected;
        nativeView = nativeView instanceof UIButton ? nativeView.titleLabel : nativeView;
        return nativeView.font;
    }
    [fontInternalProperty.setNative](value) {
        if (!(value instanceof Font) || !this.formattedText) {
            let nativeView = this.nativeTextViewProtected;
            nativeView = nativeView instanceof UIButton ? nativeView.titleLabel : nativeView;
            nativeView.font = value instanceof Font ? value.getUIFont(nativeView.font) : value;
        }
    }
    [textAlignmentProperty.setNative](value) {
        const nativeView = this.nativeTextViewProtected;
        switch (value) {
            case 'initial':
            case 'left':
                nativeView.textAlignment = 0 /* Left */;
                break;
            case 'center':
                nativeView.textAlignment = 1 /* Center */;
                break;
            case 'right':
                nativeView.textAlignment = 2 /* Right */;
                break;
            case 'justify':
                nativeView.textAlignment = 3 /* Justified */;
                break;
        }
    }
    [textDecorationProperty.setNative](value) {
        this._setNativeText();
    }
    [textTransformProperty.setNative](value) {
        this._setNativeText();
    }
    [letterSpacingProperty.setNative](value) {
        this._setNativeText();
    }
    [lineHeightProperty.setNative](value) {
        this._setNativeText();
    }
    [textShadowProperty.setNative](value) {
        this._setShadow(value);
    }
    _setColor(color) {
        if (this.nativeTextViewProtected instanceof UIButton) {
            this.nativeTextViewProtected.setTitleColorForState(color, 0 /* Normal */);
            this.nativeTextViewProtected.titleLabel.textColor = color;
        }
        else {
            this.nativeTextViewProtected.textColor = color;
        }
    }
    _setNativeText(reset = false) {
        var _a;
        if (reset) {
            const nativeView = this.nativeTextViewProtected;
            if (nativeView instanceof UIButton) {
                // Clear attributedText or title won't be affected.
                nativeView.setAttributedTitleForState(null, 0 /* Normal */);
                nativeView.setTitleForState(null, 0 /* Normal */);
            }
            else {
                // Clear attributedText or text won't be affected.
                nativeView.attributedText = null;
                nativeView.text = null;
            }
            return;
        }
        if (this.formattedText) {
            this.nativeTextViewProtected.nativeScriptSetFormattedTextDecorationAndTransform(this.getFormattedStringDetails(this.formattedText));
        }
        else {
            // console.log('setTextDecorationAndTransform...')
            const text = getTransformedText(isNullOrUndefined(this.text) ? '' : `${this.text}`, this.textTransform);
            this.nativeTextViewProtected.nativeScriptSetTextDecorationAndTransformTextDecorationLetterSpacingLineHeight(text, this.style.textDecoration || '', this.style.letterSpacing !== 0 ? this.style.letterSpacing : 0, this.style.lineHeight ? this.style.lineHeight : 0);
            if (!((_a = this.style) === null || _a === void 0 ? void 0 : _a.color) && majorVersion >= 13 && UIColor.labelColor) {
                this._setColor(UIColor.labelColor);
            }
        }
    }
    createFormattedTextNative(value) {
        return NativeScriptUtils.createMutableStringWithDetails(this.getFormattedStringDetails(value));
    }
    getFormattedStringDetails(formattedString) {
        const details = {
            spans: [],
        };
        this._spanRanges = [];
        if (formattedString && formattedString.parent) {
            for (let i = 0, spanStart = 0, length = formattedString.spans.length; i < length; i++) {
                const span = formattedString.spans.getItem(i);
                const text = span.text;
                const textTransform = formattedString.parent.textTransform;
                let spanText = isNullOrUndefined(text) ? '' : `${text}`;
                if (textTransform !== 'none' && textTransform !== 'initial') {
                    spanText = getTransformedText(spanText, textTransform);
                }
                details.spans.push(this.createMutableStringDetails(span, spanText, spanStart));
                this._spanRanges.push({
                    location: spanStart,
                    length: spanText.length,
                });
                spanStart += spanText.length;
            }
        }
        return details;
    }
    createMutableStringDetails(span, text, index) {
        const font = new Font(span.style.fontFamily, span.style.fontSize, span.style.fontStyle, span.style.fontWeight);
        const iosFont = font.getUIFont(this.nativeTextViewProtected.font);
        const backgroundColor = (span.style.backgroundColor || span.parent.backgroundColor || span.parent.parent.backgroundColor);
        return {
            text,
            iosFont,
            color: span.color ? span.color.ios : null,
            backgroundColor: backgroundColor ? backgroundColor.ios : null,
            textDecoration: getClosestPropertyValue(textDecorationProperty, span),
            letterSpacing: this.letterSpacing || 0,
            lineHeight: this.lineHeight || 0,
            baselineOffset: this.getBaselineOffset(iosFont, span.style.verticalAlignment),
            index,
        };
    }
    createMutableStringForSpan(span, text) {
        const details = this.createMutableStringDetails(span, text);
        return NativeScriptUtils.createMutableStringForSpanFontColorBackgroundColorTextDecorationBaselineOffset(details.text, details.iosFont, details.color, details.backgroundColor, details.textDecoration, details.baselineOffset);
    }
    getBaselineOffset(font, align) {
        if (!align || ['stretch', 'baseline'].includes(align)) {
            return 0;
        }
        if (align === 'top') {
            return -this.fontSize - font.descender - font.ascender - font.leading / 2;
        }
        if (align === 'bottom') {
            return font.descender + font.leading / 2;
        }
        if (align === 'text-top') {
            return -this.fontSize - font.descender - font.ascender;
        }
        if (align === 'text-bottom') {
            return font.descender;
        }
        if (align === 'middle') {
            return (font.descender - font.ascender) / 2 - font.descender;
        }
        if (align === 'sup') {
            return -this.fontSize * 0.4;
        }
        if (align === 'sub') {
            return (font.descender - font.ascender) * 0.4;
        }
    }
    _setShadow(value) {
        var _a, _b;
        const layer = iOSNativeHelper.getShadowLayer(this.nativeTextViewProtected, 'ns-text-shadow');
        if (!layer) {
            Trace.write('text-shadow not applied, no layer.', Trace.categories.Style, Trace.messageType.info);
            return;
        }
        if (isNullOrUndefined(value)) {
            // clear the text shadow
            layer.shadowOpacity = 0;
            layer.shadowRadius = 0;
            layer.shadowColor = UIColor.clearColor;
            layer.shadowOffset = CGSizeMake(0, 0);
            return;
        }
        // shadow opacity is handled on the shadow's color instance
        layer.shadowOpacity = ((_a = value.color) === null || _a === void 0 ? void 0 : _a.a) ? ((_b = value.color) === null || _b === void 0 ? void 0 : _b.a) / 255 : 1;
        layer.shadowColor = value.color.ios.CGColor;
        layer.shadowRadius = Length.toDevicePixels(value.blurRadius, 0.0);
        // prettier-ignore
        layer.shadowOffset = CGSizeMake(Length.toDevicePixels(value.offsetX, 0.0), Length.toDevicePixels(value.offsetY, 0.0));
        layer.masksToBounds = false;
        // NOTE: generally should not need shouldRasterize
        // however for various detailed animation work which involves text-shadow applicable layers, we may want to give users the control of enabling this with text-shadow
        // if (!(this.nativeTextViewProtected instanceof UITextView)) {
        //   layer.shouldRasterize = true;
        // }
    }
}
export function getTransformedText(text, textTransform) {
    if (!text || !isString(text)) {
        return '';
    }
    switch (textTransform) {
        case 'uppercase':
            return NSStringFromNSAttributedString(text).uppercaseString;
        case 'lowercase':
            return NSStringFromNSAttributedString(text).lowercaseString;
        case 'capitalize':
            return NSStringFromNSAttributedString(text).capitalizedString;
        default:
            return text;
    }
}
function NSStringFromNSAttributedString(source) {
    return NSString.stringWithString((source instanceof NSAttributedString && source.string) || source);
}
function isStringTappable(formattedString) {
    if (!formattedString) {
        return false;
    }
    for (let i = 0, length = formattedString.spans.length; i < length; i++) {
        const span = formattedString.spans.getItem(i);
        if (span.tappable) {
            return true;
        }
    }
    return false;
}
//# sourceMappingURL=index.ios.js.map