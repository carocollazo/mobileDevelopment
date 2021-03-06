import { TextView as TextViewDefinition } from '.';
import { EditableTextBase } from '../editable-text-base';
import { Property } from '../core/properties';
export declare class TextViewBase extends EditableTextBase implements TextViewDefinition {
    static returnPressEvent: string;
    maxLines: number;
}
export declare const maxLinesProperty: Property<EditableTextBase, number>;
