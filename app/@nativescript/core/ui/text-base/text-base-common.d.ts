import { PropertyChangeData } from '../../data/observable';
import { ViewBase } from '../core/view-base';
import { FontStyle, FontWeight } from '../styling/font-interfaces';
import { FormattedString } from './formatted-string';
import { Span } from './span';
import { View } from '../core/view';
import { Property, CssProperty, InheritedCssProperty } from '../core/properties';
import { Style } from '../styling/style';
import { CoreTypes } from '../../core-types';
import { TextBase as TextBaseDefinition } from '.';
import { CSSShadow } from '../styling/css-shadow';
export declare abstract class TextBaseCommon extends View implements TextBaseDefinition {
    _isSingleLine: boolean;
    text: string;
    formattedText: FormattedString;
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
    get nativeTextViewProtected(): any;
    get fontFamily(): string;
    set fontFamily(value: string);
    get fontSize(): number;
    set fontSize(value: number);
    get fontStyle(): FontStyle;
    set fontStyle(value: FontStyle);
    get fontWeight(): FontWeight;
    set fontWeight(value: FontWeight);
    get letterSpacing(): number;
    set letterSpacing(value: number);
    get lineHeight(): number;
    set lineHeight(value: number);
    get textAlignment(): CoreTypes.TextAlignmentType;
    set textAlignment(value: CoreTypes.TextAlignmentType);
    get textDecoration(): CoreTypes.TextDecorationType;
    set textDecoration(value: CoreTypes.TextDecorationType);
    get textTransform(): CoreTypes.TextTransformType;
    set textTransform(value: CoreTypes.TextTransformType);
    get textShadow(): CSSShadow;
    set textShadow(value: CSSShadow);
    get whiteSpace(): CoreTypes.WhiteSpaceType;
    set whiteSpace(value: CoreTypes.WhiteSpaceType);
    get padding(): string | CoreTypes.LengthType;
    set padding(value: string | CoreTypes.LengthType);
    get paddingTop(): CoreTypes.LengthType;
    set paddingTop(value: CoreTypes.LengthType);
    get paddingRight(): CoreTypes.LengthType;
    set paddingRight(value: CoreTypes.LengthType);
    get paddingBottom(): CoreTypes.LengthType;
    set paddingBottom(value: CoreTypes.LengthType);
    get paddingLeft(): CoreTypes.LengthType;
    set paddingLeft(value: CoreTypes.LengthType);
    _onFormattedTextContentsChanged(data: PropertyChangeData): void;
    _addChildFromBuilder(name: string, value: any): void;
    _requestLayoutOnTextChanged(): void;
    eachChild(callback: (child: ViewBase) => boolean): void;
    _setNativeText(reset?: boolean): void;
}
export declare function isBold(fontWeight: FontWeight): boolean;
export declare const textProperty: Property<TextBaseCommon, string>;
export declare const formattedTextProperty: Property<TextBaseCommon, FormattedString>;
export declare function getClosestPropertyValue<T>(property: CssProperty<any, T>, span: Span): T;
export declare const textAlignmentProperty: InheritedCssProperty<Style, CoreTypes.TextAlignmentType>;
export declare const textTransformProperty: CssProperty<Style, CoreTypes.TextTransformType>;
export declare const textShadowProperty: CssProperty<Style, string | CSSShadow>;
export declare const whiteSpaceProperty: CssProperty<Style, CoreTypes.WhiteSpaceType>;
export declare const textDecorationProperty: CssProperty<Style, CoreTypes.TextDecorationType>;
export declare const letterSpacingProperty: InheritedCssProperty<Style, number>;
export declare const lineHeightProperty: InheritedCssProperty<Style, number>;
export declare const resetSymbol: unique symbol;
