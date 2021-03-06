import { EditableTextBase as EditableTextBaseDefinition } from '.';
import { TextBase } from '../text-base';
import { Property, CssProperty } from '../core/properties';
import { Style } from '../styling/style';
import { Color } from '../../color';
import { CoreTypes } from '../../core-types';
export declare abstract class EditableTextBase extends TextBase implements EditableTextBaseDefinition {
    static blurEvent: string;
    static focusEvent: string;
    static textChangeEvent: string;
    keyboardType: CoreTypes.KeyboardInputType;
    returnKeyType: CoreTypes.ReturnKeyButtonType;
    updateTextTrigger: CoreTypes.UpdateTextTriggerType;
    autocapitalizationType: CoreTypes.AutocapitalizationInputType;
    autofillType: CoreTypes.AutofillType;
    editable: boolean;
    autocorrect: boolean;
    hint: string;
    maxLength: number;
    abstract dismissSoftInput(): any;
    abstract _setInputType(inputType: number): void;
    abstract setSelection(start: number, stop?: number): any;
    private _focusHandler;
    private _blurHandler;
    _updateTextBaseFocusStateHandler(subscribe: any): void;
}
export declare const placeholderColorProperty: CssProperty<Style, Color>;
export declare const autofillTypeProperty: Property<EditableTextBase, string>;
export declare const keyboardTypeProperty: Property<EditableTextBase, CoreTypes.KeyboardInputType>;
export declare const returnKeyTypeProperty: Property<EditableTextBase, CoreTypes.ReturnKeyButtonType>;
export declare const editableProperty: Property<EditableTextBase, boolean>;
export declare const updateTextTriggerProperty: Property<EditableTextBase, CoreTypes.UpdateTextTriggerType>;
export declare const autocapitalizationTypeProperty: Property<EditableTextBase, CoreTypes.AutocapitalizationInputType>;
export declare const autocorrectProperty: Property<EditableTextBase, boolean>;
export declare const hintProperty: Property<EditableTextBase, string>;
export declare const maxLengthProperty: Property<EditableTextBase, number>;
