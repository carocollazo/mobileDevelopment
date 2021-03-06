import { Font as FontBase, FontStyleType, FontWeightType } from './font-common';
export * from './font-common';
export declare class Font extends FontBase {
    static default: Font;
    private _uiFont;
    constructor(family: string, size: number, style: FontStyleType, weight: FontWeightType, scale: number);
    withFontFamily(family: string): Font;
    withFontStyle(style: FontStyleType): Font;
    withFontWeight(weight: FontWeightType): Font;
    withFontSize(size: number): Font;
    withFontScale(scale: number): Font;
    getUIFont(defaultFont: UIFont): UIFont;
    getAndroidTypeface(): android.graphics.Typeface;
}
export declare namespace ios {
    function registerFont(fontFile: string): void;
}
