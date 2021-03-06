import { ButtonBase } from './button-common';
import type { Background } from 'ui/styling/background';
export * from './button-common';
export declare class Button extends ButtonBase {
    nativeViewProtected: android.widget.Button;
    constructor();
    private _stateListAnimator;
    private _highlightedHandler;
    _applyBackground(background: Background, isBorderDrawable: any, onlyColor: boolean, backgroundDrawable: any): void;
    createNativeView(): globalAndroid.widget.Button;
    initNativeView(): void;
    disposeNativeView(): void;
    resetNativeView(): void;
    _updateButtonStateChangeHandler(subscribe: boolean): void;
    protected getDefaultElevation(): number;
    protected getDefaultDynamicElevationOffset(): number;
}
