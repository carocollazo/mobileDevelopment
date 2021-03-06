var TextView_1;
import { textProperty } from '../text-base';
import { TextViewBase as TextViewBaseCommon, maxLinesProperty } from './text-view-common';
import { editableProperty, hintProperty, placeholderColorProperty, _updateCharactersInRangeReplacementString } from '../editable-text-base';
import { CSSType } from '../core/view';
import { colorProperty, borderTopWidthProperty, borderRightWidthProperty, borderBottomWidthProperty, borderLeftWidthProperty, paddingTopProperty, paddingRightProperty, paddingBottomProperty, paddingLeftProperty } from '../styling/style-properties';
import { iOSNativeHelper, layout } from '../../utils';
import { profile } from '../../profiling';
const majorVersion = iOSNativeHelper.MajorVersion;
var UITextViewDelegateImpl = /** @class */ (function (_super) {
    __extends(UITextViewDelegateImpl, _super);
    function UITextViewDelegateImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    UITextViewDelegateImpl.initWithOwner = function (owner) {
        var impl = UITextViewDelegateImpl.new();
        impl._owner = owner;
        return impl;
    };
    UITextViewDelegateImpl.prototype.textViewShouldBeginEditing = function (textView) {
        var owner = this._owner.get();
        if (owner) {
            return owner.textViewShouldBeginEditing(textView);
        }
        return true;
    };
    UITextViewDelegateImpl.prototype.textViewDidBeginEditing = function (textView) {
        var owner = this._owner.get();
        if (owner) {
            owner.textViewDidBeginEditing(textView);
        }
    };
    UITextViewDelegateImpl.prototype.textViewDidEndEditing = function (textView) {
        var owner = this._owner.get();
        if (owner) {
            owner.textViewDidEndEditing(textView);
        }
    };
    UITextViewDelegateImpl.prototype.textViewDidChange = function (textView) {
        var owner = this._owner.get();
        if (owner) {
            owner.textViewDidChange(textView);
        }
    };
    UITextViewDelegateImpl.prototype.textViewShouldChangeTextInRangeReplacementText = function (textView, range, replacementString) {
        var owner = this._owner.get();
        if (owner) {
            return owner.textViewShouldChangeTextInRangeReplacementText(textView, range, replacementString);
        }
        return true;
    };
    UITextViewDelegateImpl.prototype.scrollViewDidScroll = function (sv) {
        var owner = this._owner.get();
        if (owner) {
            return owner.scrollViewDidScroll(sv);
        }
    };
    UITextViewDelegateImpl.ObjCProtocols = [UITextViewDelegate];
    return UITextViewDelegateImpl;
}(NSObject));
var NoScrollAnimationUITextView = /** @class */ (function (_super) {
    __extends(NoScrollAnimationUITextView, _super);
    function NoScrollAnimationUITextView() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    // see https://github.com/NativeScript/NativeScript/issues/6863
    // UITextView internally scrolls the text you are currently typing to visible when newline character
    // is typed but the scroll animation is not needed because at the same time we are expanding
    // the textview (setting its frame)
    NoScrollAnimationUITextView.prototype.setContentOffsetAnimated = function (contentOffset, animated) {
        _super.prototype.setContentOffsetAnimated.call(this, contentOffset, false);
    };
    return NoScrollAnimationUITextView;
}(UITextView));
let TextView = TextView_1 = class TextView extends TextViewBaseCommon {
    constructor() {
        super(...arguments);
        this._hintColor = majorVersion <= 12 || !UIColor.placeholderTextColor ? UIColor.blackColor.colorWithAlphaComponent(0.22) : UIColor.placeholderTextColor;
        this._textColor = majorVersion <= 12 || !UIColor.labelColor ? null : UIColor.labelColor;
    }
    createNativeView() {
        const textView = NoScrollAnimationUITextView.new();
        if (!textView.font) {
            textView.font = UIFont.systemFontOfSize(12);
        }
        return textView;
    }
    initNativeView() {
        super.initNativeView();
        this._delegate = UITextViewDelegateImpl.initWithOwner(new WeakRef(this));
    }
    disposeNativeView() {
        this._delegate = null;
        super.disposeNativeView();
    }
    onLoaded() {
        super.onLoaded();
        this.nativeTextViewProtected.delegate = this._delegate;
    }
    onUnloaded() {
        this.nativeTextViewProtected.delegate = null;
        super.onUnloaded();
    }
    // @ts-ignore
    get ios() {
        return this.nativeViewProtected;
    }
    textViewShouldBeginEditing(textView) {
        if (this._isShowingHint) {
            this.showText();
        }
        return this.editable;
    }
    textViewDidBeginEditing(textView) {
        this._isEditing = true;
        this.notify({ eventName: TextView_1.focusEvent, object: this });
    }
    textViewDidEndEditing(textView) {
        if (this.updateTextTrigger === 'focusLost') {
            textProperty.nativeValueChange(this, textView.text);
        }
        this._isEditing = false;
        this.dismissSoftInput();
        this._refreshHintState(this.hint, textView.text);
    }
    textViewDidChange(textView) {
        if (this.updateTextTrigger === 'textChanged') {
            textProperty.nativeValueChange(this, textView.text);
        }
        this.requestLayout();
    }
    textViewShouldChangeTextInRangeReplacementText(textView, range, replacementString) {
        const delta = replacementString.length - range.length;
        if (delta > 0) {
            if (textView.text.length + delta > this.maxLength) {
                return false;
            }
        }
        if (replacementString === '\n') {
            this.notify({ eventName: TextView_1.returnPressEvent, object: this });
        }
        if (this.formattedText) {
            _updateCharactersInRangeReplacementString(this.formattedText, range.location, range.length, replacementString);
        }
        return true;
    }
    scrollViewDidScroll(sv) {
        const contentOffset = this.nativeViewProtected.contentOffset;
        this.notify({
            object: this,
            eventName: 'scroll',
            scrollX: contentOffset.x,
            scrollY: contentOffset.y,
        });
    }
    _refreshHintState(hint, text) {
        if (this.formattedText) {
            return;
        }
        if (text !== null && text !== undefined && text !== '') {
            this.showText();
        }
        else if (!this._isEditing && hint !== null && hint !== undefined && hint !== '') {
            this.showHint(hint);
        }
        else {
            this._isShowingHint = false;
            this.nativeTextViewProtected.text = '';
        }
    }
    _refreshColor() {
        if (this._isShowingHint) {
            const placeholderColor = this.style.placeholderColor;
            const color = this.style.color;
            if (placeholderColor) {
                this.nativeTextViewProtected.textColor = placeholderColor.ios;
            }
            else if (color) {
                // Use semi-transparent version of color for back-compatibility
                this.nativeTextViewProtected.textColor = color.ios.colorWithAlphaComponent(0.22);
            }
            else {
                this.nativeTextViewProtected.textColor = this._hintColor;
            }
        }
        else {
            const color = this.style.color;
            if (color) {
                this.nativeTextViewProtected.textColor = color.ios;
                this.nativeTextViewProtected.tintColor = color.ios;
            }
            else {
                this.nativeTextViewProtected.textColor = this._textColor;
                this.nativeTextViewProtected.tintColor = this._textColor;
            }
        }
    }
    showHint(hint) {
        const nativeView = this.nativeTextViewProtected;
        this._isShowingHint = true;
        this._refreshColor();
        const hintAsString = hint === null || hint === undefined ? '' : hint.toString();
        nativeView.text = hintAsString;
    }
    showText() {
        this._isShowingHint = false;
        this._setNativeText();
        this._refreshColor();
        this.requestLayout();
    }
    [textProperty.getDefault]() {
        return '';
    }
    [textProperty.setNative](value) {
        this._refreshHintState(this.hint, value);
    }
    [hintProperty.getDefault]() {
        return '';
    }
    [hintProperty.setNative](value) {
        this._refreshHintState(value, this.text);
    }
    [editableProperty.getDefault]() {
        return this.nativeTextViewProtected.editable;
    }
    [editableProperty.setNative](value) {
        this.nativeTextViewProtected.editable = value;
    }
    [colorProperty.setNative](color) {
        this._refreshColor();
    }
    [placeholderColorProperty.setNative](value) {
        this._refreshColor();
    }
    [borderTopWidthProperty.getDefault]() {
        return {
            value: this.nativeTextViewProtected.textContainerInset.top,
            unit: 'px',
        };
    }
    [borderTopWidthProperty.setNative](value) {
        const inset = this.nativeTextViewProtected.textContainerInset;
        const top = layout.toDeviceIndependentPixels(this.effectivePaddingTop + this.effectiveBorderTopWidth);
        this.nativeTextViewProtected.textContainerInset = {
            top: top,
            left: inset.left,
            bottom: inset.bottom,
            right: inset.right,
        };
    }
    [borderRightWidthProperty.getDefault]() {
        return {
            value: this.nativeTextViewProtected.textContainerInset.right,
            unit: 'px',
        };
    }
    [borderRightWidthProperty.setNative](value) {
        const inset = this.nativeTextViewProtected.textContainerInset;
        const right = layout.toDeviceIndependentPixels(this.effectivePaddingRight + this.effectiveBorderRightWidth);
        this.nativeTextViewProtected.textContainerInset = {
            top: inset.top,
            left: inset.left,
            bottom: inset.bottom,
            right: right,
        };
    }
    [borderBottomWidthProperty.getDefault]() {
        return {
            value: this.nativeTextViewProtected.textContainerInset.bottom,
            unit: 'px',
        };
    }
    [borderBottomWidthProperty.setNative](value) {
        const inset = this.nativeTextViewProtected.textContainerInset;
        const bottom = layout.toDeviceIndependentPixels(this.effectivePaddingBottom + this.effectiveBorderBottomWidth);
        this.nativeTextViewProtected.textContainerInset = {
            top: inset.top,
            left: inset.left,
            bottom: bottom,
            right: inset.right,
        };
    }
    [borderLeftWidthProperty.getDefault]() {
        return {
            value: this.nativeTextViewProtected.textContainerInset.left,
            unit: 'px',
        };
    }
    [borderLeftWidthProperty.setNative](value) {
        const inset = this.nativeTextViewProtected.textContainerInset;
        const left = layout.toDeviceIndependentPixels(this.effectivePaddingLeft + this.effectiveBorderLeftWidth);
        this.nativeTextViewProtected.textContainerInset = {
            top: inset.top,
            left: left,
            bottom: inset.bottom,
            right: inset.right,
        };
    }
    [paddingTopProperty.getDefault]() {
        return {
            value: this.nativeTextViewProtected.textContainerInset.top,
            unit: 'px',
        };
    }
    [paddingTopProperty.setNative](value) {
        const inset = this.nativeTextViewProtected.textContainerInset;
        const top = layout.toDeviceIndependentPixels(this.effectivePaddingTop + this.effectiveBorderTopWidth);
        this.nativeTextViewProtected.textContainerInset = {
            top: top,
            left: inset.left,
            bottom: inset.bottom,
            right: inset.right,
        };
    }
    [paddingRightProperty.getDefault]() {
        return {
            value: this.nativeTextViewProtected.textContainerInset.right,
            unit: 'px',
        };
    }
    [paddingRightProperty.setNative](value) {
        const inset = this.nativeTextViewProtected.textContainerInset;
        const right = layout.toDeviceIndependentPixels(this.effectivePaddingRight + this.effectiveBorderRightWidth);
        this.nativeTextViewProtected.textContainerInset = {
            top: inset.top,
            left: inset.left,
            bottom: inset.bottom,
            right: right,
        };
    }
    [paddingBottomProperty.getDefault]() {
        return {
            value: this.nativeTextViewProtected.textContainerInset.bottom,
            unit: 'px',
        };
    }
    [paddingBottomProperty.setNative](value) {
        const inset = this.nativeTextViewProtected.textContainerInset;
        const bottom = layout.toDeviceIndependentPixels(this.effectivePaddingBottom + this.effectiveBorderBottomWidth);
        this.nativeTextViewProtected.textContainerInset = {
            top: inset.top,
            left: inset.left,
            bottom: bottom,
            right: inset.right,
        };
    }
    [paddingLeftProperty.getDefault]() {
        return {
            value: this.nativeTextViewProtected.textContainerInset.left,
            unit: 'px',
        };
    }
    [paddingLeftProperty.setNative](value) {
        const inset = this.nativeTextViewProtected.textContainerInset;
        const left = layout.toDeviceIndependentPixels(this.effectivePaddingLeft + this.effectiveBorderLeftWidth);
        this.nativeTextViewProtected.textContainerInset = {
            top: inset.top,
            left: left,
            bottom: inset.bottom,
            right: inset.right,
        };
    }
    [maxLinesProperty.getDefault]() {
        return 0;
    }
    [maxLinesProperty.setNative](value) {
        this.nativeTextViewProtected.textContainer.maximumNumberOfLines = value;
        if (value !== 0) {
            this.nativeTextViewProtected.textContainer.lineBreakMode = 4 /* ByTruncatingTail */;
        }
        else {
            this.nativeTextViewProtected.textContainer.lineBreakMode = 0 /* ByWordWrapping */;
        }
    }
};
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], TextView.prototype, "onLoaded", null);
TextView = TextView_1 = __decorate([
    CSSType('TextView')
], TextView);
export { TextView };
TextView.prototype.recycleNativeView = 'auto';
//# sourceMappingURL=index.ios.js.map