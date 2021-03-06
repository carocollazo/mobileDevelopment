// Requires.
import { FormattedString } from './formatted-string';
import { View } from '../core/view';
import { Property, CssProperty, InheritedCssProperty, makeValidator, makeParser } from '../core/properties';
import { Style } from '../styling/style';
import { Observable } from '../../data/observable';
import { parseCSSShadow } from '../styling/css-shadow';
const CHILD_SPAN = 'Span';
const CHILD_FORMATTED_TEXT = 'formattedText';
const CHILD_FORMATTED_STRING = 'FormattedString';
export class TextBaseCommon extends View {
    /***
     * In the NativeScript Core; by default the nativeTextViewProtected points to the same value as nativeViewProtected.
     * At this point no internal NS components need this indirection functionality.
     * This indirection is used to allow support usage by third party components so they don't have to duplicate functionality.
     *
     * A third party component can just override the `nativeTextViewProtected` getter and return a different internal view and that view would be
     * what all TextView/TextInput class features would be applied to.
     *
     * A example is the Android MaterialDesign TextInput class, it has a wrapper view of a TextInputLayout
     *    https://developer.android.com/reference/com/google/android/material/textfield/TextInputLayout
     * which wraps the actual TextInput.  This wrapper layout (TextInputLayout) must be assigned to the nativeViewProtected as the entire
     * NS Core uses nativeViewProtected for everything related to layout, so that it can be measured, added to the parent view as a child, ect.
     *
     * However, its internal view would be the actual TextView/TextInput and to allow that sub-view to have the normal TextView/TextInput
     * class features, which we expose and to allow them to work on it, the internal TextView/TextInput is what the needs to have the class values applied to it.
     *
     * So all code that works on what is expected to be a TextView/TextInput should use `nativeTextViewProtected` so that any third party
     * components that need to have two separate components can work properly without them having to duplicate all the TextBase (and decendants) functionality
     * by just overriding the nativeTextViewProtected getter.
     **/
    get nativeTextViewProtected() {
        return this.nativeViewProtected;
    }
    get fontFamily() {
        return this.style.fontFamily;
    }
    set fontFamily(value) {
        this.style.fontFamily = value;
    }
    get fontSize() {
        return this.style.fontSize;
    }
    set fontSize(value) {
        this.style.fontSize = value;
    }
    get fontStyle() {
        return this.style.fontStyle;
    }
    set fontStyle(value) {
        this.style.fontStyle = value;
    }
    get fontWeight() {
        return this.style.fontWeight;
    }
    set fontWeight(value) {
        this.style.fontWeight = value;
    }
    get letterSpacing() {
        return this.style.letterSpacing;
    }
    set letterSpacing(value) {
        this.style.letterSpacing = value;
    }
    get lineHeight() {
        return this.style.lineHeight;
    }
    set lineHeight(value) {
        this.style.lineHeight = value;
    }
    get textAlignment() {
        return this.style.textAlignment;
    }
    set textAlignment(value) {
        this.style.textAlignment = value;
    }
    get textDecoration() {
        return this.style.textDecoration;
    }
    set textDecoration(value) {
        this.style.textDecoration = value;
    }
    get textTransform() {
        return this.style.textTransform;
    }
    set textTransform(value) {
        this.style.textTransform = value;
    }
    get textShadow() {
        return this.style.textShadow;
    }
    set textShadow(value) {
        this.style.textShadow = value;
    }
    get whiteSpace() {
        return this.style.whiteSpace;
    }
    set whiteSpace(value) {
        this.style.whiteSpace = value;
    }
    get padding() {
        return this.style.padding;
    }
    set padding(value) {
        this.style.padding = value;
    }
    get paddingTop() {
        return this.style.paddingTop;
    }
    set paddingTop(value) {
        this.style.paddingTop = value;
    }
    get paddingRight() {
        return this.style.paddingRight;
    }
    set paddingRight(value) {
        this.style.paddingRight = value;
    }
    get paddingBottom() {
        return this.style.paddingBottom;
    }
    set paddingBottom(value) {
        this.style.paddingBottom = value;
    }
    get paddingLeft() {
        return this.style.paddingLeft;
    }
    set paddingLeft(value) {
        this.style.paddingLeft = value;
    }
    _onFormattedTextContentsChanged(data) {
        if (this.nativeViewProtected) {
            // Notifications from the FormattedString start arriving before the Android view is even created.
            this[formattedTextProperty.setNative](data.value);
        }
    }
    _addChildFromBuilder(name, value) {
        if (name === CHILD_SPAN) {
            if (!this.formattedText) {
                const formattedText = new FormattedString();
                formattedText.spans.push(value);
                this.formattedText = formattedText;
            }
            else {
                this.formattedText.spans.push(value);
            }
        }
        else if (name === CHILD_FORMATTED_TEXT || name === CHILD_FORMATTED_STRING) {
            this.formattedText = value;
        }
    }
    _requestLayoutOnTextChanged() {
        this.requestLayout();
    }
    eachChild(callback) {
        const text = this.formattedText;
        if (text) {
            callback(text);
        }
    }
    _setNativeText(reset = false) {
        //
    }
}
TextBaseCommon.prototype._isSingleLine = false;
export function isBold(fontWeight) {
    return fontWeight === 'bold' || fontWeight === '700' || fontWeight === '800' || fontWeight === '900';
}
export const textProperty = new Property({
    name: 'text',
    defaultValue: '',
    affectsLayout: global.isAndroid,
});
textProperty.register(TextBaseCommon);
export const formattedTextProperty = new Property({
    name: 'formattedText',
    affectsLayout: true,
    valueChanged: onFormattedTextPropertyChanged,
});
formattedTextProperty.register(TextBaseCommon);
function onFormattedTextPropertyChanged(textBase, oldValue, newValue) {
    if (oldValue) {
        oldValue.off(Observable.propertyChangeEvent, textBase._onFormattedTextContentsChanged, textBase);
        textBase._removeView(oldValue);
    }
    if (newValue) {
        const oldParent = newValue.parent;
        // In case formattedString is attached to new TextBase
        if (oldParent) {
            oldParent._removeView(newValue);
        }
        textBase._addView(newValue);
        newValue.on(Observable.propertyChangeEvent, textBase._onFormattedTextContentsChanged, textBase);
    }
}
export function getClosestPropertyValue(property, span) {
    if (property.isSet(span.style)) {
        return span.style[property.name];
    }
    else if (property.isSet(span.parent.style)) {
        // parent is FormattedString
        return span.parent.style[property.name];
    }
    else if (property.isSet(span.parent.parent.style)) {
        // parent.parent is TextBase
        return span.parent.parent.style[property.name];
    }
}
const textAlignmentConverter = makeParser(makeValidator('initial', 'left', 'center', 'right', 'justify'));
export const textAlignmentProperty = new InheritedCssProperty({
    name: 'textAlignment',
    cssName: 'text-align',
    defaultValue: 'initial',
    valueConverter: textAlignmentConverter,
});
textAlignmentProperty.register(Style);
const textTransformConverter = makeParser(makeValidator('initial', 'none', 'capitalize', 'uppercase', 'lowercase'));
export const textTransformProperty = new CssProperty({
    name: 'textTransform',
    cssName: 'text-transform',
    defaultValue: 'initial',
    valueConverter: textTransformConverter,
});
textTransformProperty.register(Style);
export const textShadowProperty = new CssProperty({
    name: 'textShadow',
    cssName: 'text-shadow',
    affectsLayout: global.isIOS,
    valueConverter: (value) => {
        return parseCSSShadow(value);
    },
});
textShadowProperty.register(Style);
const whiteSpaceConverter = makeParser(makeValidator('initial', 'normal', 'nowrap'));
export const whiteSpaceProperty = new CssProperty({
    name: 'whiteSpace',
    cssName: 'white-space',
    defaultValue: 'initial',
    affectsLayout: global.isIOS,
    valueConverter: whiteSpaceConverter,
});
whiteSpaceProperty.register(Style);
const textDecorationConverter = makeParser(makeValidator('none', 'underline', 'line-through', 'underline line-through'));
export const textDecorationProperty = new CssProperty({
    name: 'textDecoration',
    cssName: 'text-decoration',
    defaultValue: 'none',
    valueConverter: textDecorationConverter,
});
textDecorationProperty.register(Style);
export const letterSpacingProperty = new InheritedCssProperty({
    name: 'letterSpacing',
    cssName: 'letter-spacing',
    defaultValue: 0,
    affectsLayout: global.isIOS,
    valueConverter: (v) => parseFloat(v),
});
letterSpacingProperty.register(Style);
export const lineHeightProperty = new InheritedCssProperty({
    name: 'lineHeight',
    cssName: 'line-height',
    affectsLayout: global.isIOS,
    valueConverter: (v) => parseFloat(v),
});
lineHeightProperty.register(Style);
export const resetSymbol = Symbol('textPropertyDefault');
//# sourceMappingURL=text-base-common.js.map