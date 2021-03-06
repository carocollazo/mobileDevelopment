// Types
import { getClosestPropertyValue } from './text-base-common';
// Requires
import { Font } from '../styling/font';
import { backgroundColorProperty } from '../styling/style-properties';
import { TextBaseCommon, formattedTextProperty, textAlignmentProperty, textDecorationProperty, textProperty, textTransformProperty, textShadowProperty, letterSpacingProperty, whiteSpaceProperty, lineHeightProperty, isBold, resetSymbol } from './text-base-common';
import { Color } from '../../color';
import { colorProperty, fontSizeProperty, fontInternalProperty, paddingLeftProperty, paddingTopProperty, paddingRightProperty, paddingBottomProperty, Length } from '../styling/style-properties';
import { Span } from './span';
import { CoreTypes } from '../../core-types';
import { layout } from '../../utils';
import { isString, isNullOrUndefined } from '../../utils/types';
import { accessibilityIdentifierProperty } from '../../accessibility/accessibility-properties';
import * as Utils from '../../utils';
import { testIDProperty } from '../../ui/core/view';
export * from './text-base-common';
let TextTransformation;
function initializeTextTransformation() {
    if (TextTransformation) {
        return;
    }
    var TextTransformationImpl = /** @class */ (function (_super) {
    __extends(TextTransformationImpl, _super);
    function TextTransformationImpl(textBase) {
        var _this = _super.call(this) || this;
        _this.textBase = textBase;
        return global.__native(_this);
    }
    TextTransformationImpl.prototype.getTransformation = function (charSeq, view) {
        // NOTE: Do we need to transform the new text here?
        var formattedText = this.textBase.formattedText;
        if (formattedText) {
            return this.textBase.createFormattedTextNative(formattedText);
        }
        else {
            var text = this.textBase.text;
            var stringValue = isNullOrUndefined(text) ? '' : text.toString();
            return getTransformedText(stringValue, this.textBase.textTransform);
        }
    };
    TextTransformationImpl.prototype.onFocusChanged = function (view, sourceText, focused, direction, previouslyFocusedRect) {
        // Do nothing for now.
    };
    TextTransformationImpl = __decorate([
        Interfaces([android.text.method.TransformationMethod])
    ], TextTransformationImpl);
    return TextTransformationImpl;
}(java.lang.Object));
    TextTransformation = TextTransformationImpl;
}
let ClickableSpan;
function initializeClickableSpan() {
    if (ClickableSpan) {
        return;
    }
    var ClickableSpanImpl = /** @class */ (function (_super) {
    __extends(ClickableSpanImpl, _super);
    function ClickableSpanImpl(owner) {
        var _this = _super.call(this) || this;
        _this.owner = new WeakRef(owner);
        return global.__native(_this);
    }
    ClickableSpanImpl.prototype.onClick = function (view) {
        var owner = this.owner.get();
        if (owner) {
            owner._emit(Span.linkTapEvent);
        }
        view.clearFocus();
        view.invalidate();
    };
    ClickableSpanImpl.prototype.updateDrawState = function (tp) {
        // don't style as link
    };
    return ClickableSpanImpl;
}(android.text.style.ClickableSpan));
    ClickableSpan = ClickableSpanImpl;
}
let BaselineAdjustedSpan;
function initializeBaselineAdjustedSpan() {
    if (BaselineAdjustedSpan) {
        return;
    }
    var BaselineAdjustedSpanImpl = /** @class */ (function (_super) {
    __extends(BaselineAdjustedSpanImpl, _super);
    function BaselineAdjustedSpanImpl(fontSize, align) {
        var _this = _super.call(this) || this;
        _this.align = 'baseline';
        _this.align = align;
        _this.fontSize = fontSize;
        return _this;
    }
    BaselineAdjustedSpanImpl.prototype.updateDrawState = function (paint) {
        this.updateState(paint);
    };
    BaselineAdjustedSpanImpl.prototype.updateMeasureState = function (paint) {
        this.updateState(paint);
    };
    BaselineAdjustedSpanImpl.prototype.updateState = function (paint) {
        var metrics = paint.getFontMetrics();
        if (!this.align || ['baseline', 'stretch'].includes(this.align)) {
            return;
        }
        if (this.align === 'top') {
            return (paint.baselineShift = -this.fontSize - metrics.bottom - metrics.top);
        }
        if (this.align === 'bottom') {
            return (paint.baselineShift = metrics.bottom);
        }
        if (this.align === 'text-top') {
            return (paint.baselineShift = -this.fontSize - metrics.descent - metrics.ascent);
        }
        if (this.align === 'text-bottom') {
            return (paint.baselineShift = metrics.bottom - metrics.descent);
        }
        if (this.align === 'middle') {
            return (paint.baselineShift = (metrics.descent - metrics.ascent) / 2 - metrics.descent);
        }
        if (this.align === 'sup') {
            return (paint.baselineShift = -this.fontSize * 0.4);
        }
        if (this.align === 'sub') {
            return (paint.baselineShift = (metrics.descent - metrics.ascent) * 0.4);
        }
    };
    return BaselineAdjustedSpanImpl;
}(android.text.style.MetricAffectingSpan));
    BaselineAdjustedSpan = BaselineAdjustedSpanImpl;
}
export class TextBase extends TextBaseCommon {
    constructor() {
        super(...arguments);
        this._tappable = false;
    }
    initNativeView() {
        super.initNativeView();
        initializeTextTransformation();
        const nativeView = this.nativeTextViewProtected;
        this._defaultTransformationMethod = nativeView.getTransformationMethod();
        this._defaultMovementMethod = nativeView.getMovementMethod();
        this._minHeight = nativeView.getMinHeight();
        this._maxHeight = nativeView.getMaxHeight();
        this._minLines = nativeView.getMinLines();
        this._maxLines = nativeView.getMaxLines();
    }
    resetNativeView() {
        super.resetNativeView();
        const nativeView = this.nativeTextViewProtected;
        // We reset it here too because this could be changed by multiple properties - whiteSpace, secure, textTransform
        nativeView.setSingleLine(this._isSingleLine);
        nativeView.setTransformationMethod(this._defaultTransformationMethod);
        this._defaultTransformationMethod = null;
        if (this._paintFlags !== undefined) {
            nativeView.setPaintFlags(this._paintFlags);
            this._paintFlags = undefined;
        }
        if (this._minLines !== -1) {
            nativeView.setMinLines(this._minLines);
        }
        else {
            nativeView.setMinHeight(this._minHeight);
        }
        this._minHeight = this._minLines = undefined;
        if (this._maxLines !== -1) {
            nativeView.setMaxLines(this._maxLines);
        }
        else {
            nativeView.setMaxHeight(this._maxHeight);
        }
        this._maxHeight = this._maxLines = undefined;
    }
    [textProperty.getDefault]() {
        return resetSymbol;
    }
    [textProperty.setNative](value) {
        const reset = value === resetSymbol;
        if (!reset && this.formattedText) {
            return;
        }
        this._setTappableState(false);
        this._setNativeText(reset);
    }
    createFormattedTextNative(value) {
        return createSpannableStringBuilder(value, this.style.fontSize);
    }
    [formattedTextProperty.setNative](value) {
        const nativeView = this.nativeTextViewProtected;
        if (!value) {
            if (nativeView instanceof android.widget.Button && nativeView.getTransformationMethod() instanceof TextTransformation) {
                nativeView.setTransformationMethod(this._defaultTransformationMethod);
            }
        }
        // Don't change the transformation method if this is secure TextField or we'll lose the hiding characters.
        if (this.secure) {
            return;
        }
        const spannableStringBuilder = this.createFormattedTextNative(value);
        nativeView.setText(spannableStringBuilder);
        this._setTappableState(isStringTappable(value));
        textProperty.nativeValueChange(this, value === null || value === undefined ? '' : value.toString());
        if (spannableStringBuilder && nativeView instanceof android.widget.Button && !(nativeView.getTransformationMethod() instanceof TextTransformation)) {
            // Replace Android Button's default transformation (in case the developer has not already specified a text-transform) method
            // with our transformation method which can handle formatted text.
            // Otherwise, the default tranformation method of the Android Button will overwrite and ignore our spannableStringBuilder.
            nativeView.setTransformationMethod(new TextTransformation(this));
        }
    }
    [textTransformProperty.setNative](value) {
        if (value === 'initial') {
            this.nativeTextViewProtected.setTransformationMethod(this._defaultTransformationMethod);
            return;
        }
        // Don't change the transformation method if this is secure TextField or we'll lose the hiding characters.
        if (this.secure) {
            return;
        }
        this.nativeTextViewProtected.setTransformationMethod(new TextTransformation(this));
    }
    [textAlignmentProperty.getDefault]() {
        return 'initial';
    }
    [textAlignmentProperty.setNative](value) {
        const verticalGravity = this.nativeTextViewProtected.getGravity() & android.view.Gravity.VERTICAL_GRAVITY_MASK;
        switch (value) {
            case 'center':
                this.nativeTextViewProtected.setGravity(android.view.Gravity.CENTER_HORIZONTAL | verticalGravity);
                break;
            case 'right':
                this.nativeTextViewProtected.setGravity(android.view.Gravity.END | verticalGravity);
                break;
            default:
                // initial | left | justify
                this.nativeTextViewProtected.setGravity(android.view.Gravity.START | verticalGravity);
                break;
        }
        if (android.os.Build.VERSION.SDK_INT >= 26) {
            if (value === 'justify') {
                this.nativeTextViewProtected.setJustificationMode(android.text.Layout.JUSTIFICATION_MODE_INTER_WORD);
            }
            else {
                this.nativeTextViewProtected.setJustificationMode(android.text.Layout.JUSTIFICATION_MODE_NONE);
            }
        }
    }
    // Overridden in TextField because setSingleLine(false) will remove methodTransformation.
    // and we don't want to allow TextField to be multiline
    [whiteSpaceProperty.setNative](value) {
        const nativeView = this.nativeTextViewProtected;
        switch (value) {
            case 'initial':
            case 'normal':
                nativeView.setSingleLine(false);
                nativeView.setEllipsize(null);
                break;
            case 'nowrap':
                nativeView.setSingleLine(true);
                nativeView.setEllipsize(android.text.TextUtils.TruncateAt.END);
                break;
        }
    }
    [colorProperty.getDefault]() {
        return this.nativeTextViewProtected.getTextColors();
    }
    [colorProperty.setNative](value) {
        if (!this.formattedText || !(value instanceof Color)) {
            if (value instanceof Color) {
                this.nativeTextViewProtected.setTextColor(value.android);
            }
            else {
                this.nativeTextViewProtected.setTextColor(value);
            }
        }
    }
    [fontSizeProperty.getDefault]() {
        return { nativeSize: this.nativeTextViewProtected.getTextSize() };
    }
    [fontSizeProperty.setNative](value) {
        if (!this.formattedText || typeof value !== 'number') {
            if (typeof value === 'number') {
                this.nativeTextViewProtected.setTextSize(value);
            }
            else {
                this.nativeTextViewProtected.setTextSize(android.util.TypedValue.COMPLEX_UNIT_PX, value.nativeSize);
            }
        }
    }
    [lineHeightProperty.getDefault]() {
        return this.nativeTextViewProtected.getLineSpacingExtra() / layout.getDisplayDensity();
    }
    [lineHeightProperty.setNative](value) {
        this.nativeTextViewProtected.setLineSpacing(value * layout.getDisplayDensity(), 1);
    }
    [fontInternalProperty.getDefault]() {
        return this.nativeTextViewProtected.getTypeface();
    }
    [fontInternalProperty.setNative](value) {
        if (!this.formattedText || !(value instanceof Font)) {
            this.nativeTextViewProtected.setTypeface(value instanceof Font ? value.getAndroidTypeface() : value);
        }
    }
    [textDecorationProperty.getDefault](value) {
        return (this._paintFlags = this.nativeTextViewProtected.getPaintFlags());
    }
    [textDecorationProperty.setNative](value) {
        switch (value) {
            case 'none':
                this.nativeTextViewProtected.setPaintFlags(0);
                break;
            case 'underline':
                this.nativeTextViewProtected.setPaintFlags(android.graphics.Paint.UNDERLINE_TEXT_FLAG);
                break;
            case 'line-through':
                this.nativeTextViewProtected.setPaintFlags(android.graphics.Paint.STRIKE_THRU_TEXT_FLAG);
                break;
            case 'underline line-through':
                this.nativeTextViewProtected.setPaintFlags(android.graphics.Paint.UNDERLINE_TEXT_FLAG | android.graphics.Paint.STRIKE_THRU_TEXT_FLAG);
                break;
            default:
                this.nativeTextViewProtected.setPaintFlags(value);
                break;
        }
    }
    [textShadowProperty.getDefault](value) {
        return {
            radius: this.nativeTextViewProtected.getShadowRadius(),
            offsetX: this.nativeTextViewProtected.getShadowDx(),
            offsetY: this.nativeTextViewProtected.getShadowDy(),
            color: this.nativeTextViewProtected.getShadowColor(),
        };
    }
    [textShadowProperty.setNative](value) {
        // prettier-ignore
        this.nativeTextViewProtected.setShadowLayer(Length.toDevicePixels(value.blurRadius, java.lang.Float.MIN_VALUE), Length.toDevicePixels(value.offsetX, 0), Length.toDevicePixels(value.offsetY, 0), value.color.android);
    }
    [letterSpacingProperty.getDefault]() {
        return org.nativescript.widgets.ViewHelper.getLetterspacing(this.nativeTextViewProtected);
    }
    [letterSpacingProperty.setNative](value) {
        org.nativescript.widgets.ViewHelper.setLetterspacing(this.nativeTextViewProtected, value);
    }
    [paddingTopProperty.getDefault]() {
        return { value: this._defaultPaddingTop, unit: 'px' };
    }
    [paddingTopProperty.setNative](value) {
        org.nativescript.widgets.ViewHelper.setPaddingTop(this.nativeTextViewProtected, Length.toDevicePixels(value, 0) + Length.toDevicePixels(this.style.borderTopWidth, 0));
    }
    [paddingRightProperty.getDefault]() {
        return { value: this._defaultPaddingRight, unit: 'px' };
    }
    [paddingRightProperty.setNative](value) {
        org.nativescript.widgets.ViewHelper.setPaddingRight(this.nativeTextViewProtected, Length.toDevicePixels(value, 0) + Length.toDevicePixels(this.style.borderRightWidth, 0));
    }
    [paddingBottomProperty.getDefault]() {
        return { value: this._defaultPaddingBottom, unit: 'px' };
    }
    [paddingBottomProperty.setNative](value) {
        org.nativescript.widgets.ViewHelper.setPaddingBottom(this.nativeTextViewProtected, Length.toDevicePixels(value, 0) + Length.toDevicePixels(this.style.borderBottomWidth, 0));
    }
    [paddingLeftProperty.getDefault]() {
        return { value: this._defaultPaddingLeft, unit: 'px' };
    }
    [paddingLeftProperty.setNative](value) {
        org.nativescript.widgets.ViewHelper.setPaddingLeft(this.nativeTextViewProtected, Length.toDevicePixels(value, 0) + Length.toDevicePixels(this.style.borderLeftWidth, 0));
    }
    [testIDProperty.setNative](value) {
        this.setTestID(this.nativeTextViewProtected, value);
    }
    [accessibilityIdentifierProperty.setNative](value) {
        if (typeof __USE_TEST_ID__ !== 'undefined' && __USE_TEST_ID__ && this.testID) {
            // ignore when using testID;
        }
        else {
            // we override the default setter to apply it on nativeTextViewProtected
            const id = Utils.ad.resources.getId(':id/nativescript_accessibility_id');
            if (id) {
                this.nativeTextViewProtected.setTag(id, value);
                this.nativeTextViewProtected.setTag(value);
            }
        }
    }
    _setNativeText(reset = false) {
        if (reset) {
            this.nativeTextViewProtected.setText(null);
            return;
        }
        let transformedText;
        if (this.formattedText) {
            transformedText = this.createFormattedTextNative(this.formattedText);
        }
        else {
            const text = this.text;
            const stringValue = text === null || text === undefined ? '' : text.toString();
            transformedText = getTransformedText(stringValue, this.textTransform);
        }
        this.nativeTextViewProtected.setText(transformedText);
    }
    _setTappableState(tappable) {
        if (this._tappable !== tappable) {
            this._tappable = tappable;
            if (this._tappable) {
                this.nativeTextViewProtected.setMovementMethod(android.text.method.LinkMovementMethod.getInstance());
                this.nativeTextViewProtected.setHighlightColor(null);
            }
            else {
                this.nativeTextViewProtected.setMovementMethod(this._defaultMovementMethod);
            }
        }
    }
}
function getCapitalizedString(str) {
    let newString = str.toLowerCase();
    newString = newString.replace(/(?:^|\s|[-"'([{])+\S/g, (c) => c.toUpperCase());
    return newString;
}
export function getTransformedText(text, textTransform) {
    if (!text || !isString(text)) {
        return '';
    }
    switch (textTransform) {
        case 'uppercase':
            return text.toUpperCase();
        case 'lowercase':
            return text.toLowerCase();
        case 'capitalize':
            return getCapitalizedString(text);
        case 'none':
        default:
            return text;
    }
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
function createSpannableStringBuilder(formattedString, defaultFontSize) {
    if (!formattedString || !formattedString.parent) {
        return null;
    }
    const ssb = new android.text.SpannableStringBuilder();
    for (let i = 0, spanStart = 0, spanLength = 0, length = formattedString.spans.length; i < length; i++) {
        const span = formattedString.spans.getItem(i);
        const text = span.text;
        const textTransform = formattedString.parent.textTransform;
        let spanText = text === null || text === undefined ? '' : text.toString();
        if (textTransform && textTransform !== 'none') {
            spanText = getTransformedText(spanText, textTransform);
        }
        spanLength = spanText.length;
        if (spanLength > 0) {
            ssb.insert(spanStart, spanText);
            setSpanModifiers(ssb, span, spanStart, spanStart + spanLength, defaultFontSize);
            spanStart += spanLength;
        }
    }
    return ssb;
}
function setSpanModifiers(ssb, span, start, end, defaultFontSize) {
    const spanStyle = span.style;
    const bold = isBold(spanStyle.fontWeight);
    const italic = spanStyle.fontStyle === 'italic';
    const align = spanStyle.verticalAlignment;
    if (bold && italic) {
        ssb.setSpan(new android.text.style.StyleSpan(android.graphics.Typeface.BOLD_ITALIC), start, end, android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
    }
    else if (bold) {
        ssb.setSpan(new android.text.style.StyleSpan(android.graphics.Typeface.BOLD), start, end, android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
    }
    else if (italic) {
        ssb.setSpan(new android.text.style.StyleSpan(android.graphics.Typeface.ITALIC), start, end, android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
    }
    const fontFamily = span.fontFamily;
    if (fontFamily) {
        const font = new Font(fontFamily, 0, italic ? 'italic' : 'normal', bold ? 'bold' : 'normal');
        const typeface = font.getAndroidTypeface() || android.graphics.Typeface.create(fontFamily, 0);
        const typefaceSpan = new org.nativescript.widgets.CustomTypefaceSpan(fontFamily, typeface);
        ssb.setSpan(typefaceSpan, start, end, android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
    }
    const realFontSize = span.fontSize;
    if (realFontSize) {
        ssb.setSpan(new android.text.style.AbsoluteSizeSpan(realFontSize * layout.getDisplayDensity()), start, end, android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
    }
    const color = span.color;
    if (color) {
        ssb.setSpan(new android.text.style.ForegroundColorSpan(color.android), start, end, android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
    }
    const backgroundColor = getClosestPropertyValue(backgroundColorProperty, span);
    if (backgroundColor) {
        ssb.setSpan(new android.text.style.BackgroundColorSpan(backgroundColor.android), start, end, android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
    }
    const textDecoration = getClosestPropertyValue(textDecorationProperty, span);
    if (textDecoration) {
        const underline = textDecoration.indexOf('underline') !== -1;
        if (underline) {
            ssb.setSpan(new android.text.style.UnderlineSpan(), start, end, android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        }
        const strikethrough = textDecoration.indexOf('line-through') !== -1;
        if (strikethrough) {
            ssb.setSpan(new android.text.style.StrikethroughSpan(), start, end, android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        }
    }
    if (align) {
        initializeBaselineAdjustedSpan();
        ssb.setSpan(new BaselineAdjustedSpan(defaultFontSize * layout.getDisplayDensity(), align), start, end, android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
    }
    const tappable = span.tappable;
    if (tappable) {
        initializeClickableSpan();
        ssb.setSpan(new ClickableSpan(span), start, end, android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
    }
    // TODO: Implement letterSpacing for Span here.
    // const letterSpacing = formattedString.parent.style.letterSpacing;
    // if (letterSpacing > 0) {
    //     ssb.setSpan(new android.text.style.ScaleXSpan((letterSpacing + 1) / 10), start, end, android.text.Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);
    // }
}
//# sourceMappingURL=index.android.js.map