import { Point, View as ViewDefinition } from '.';
import { ViewCommon } from './view-common';
import { ShowModalOptions } from '../view-base';
import { Background } from '../../styling/background';
import { AccessibilityEventOptions } from '../../../accessibility';
export * from './view-common';
export * from './view-helper';
export * from '../properties';
export declare class View extends ViewCommon implements ViewDefinition {
    nativeViewProtected: UIView;
    viewController: UIViewController;
    private _popoverPresentationDelegate;
    private _adaptivePresentationDelegate;
    /**
     * Track modal open animated options to use same option upon close
     */
    private _modalAnimatedOptions;
    private _isLaidOut;
    private _hasTransfrom;
    private _privateFlags;
    private _cachedFrame;
    private _suspendCATransaction;
    /**
     * Native background states.
     *  - `unset` - is the default, from this state it transitions to "invalid" in the base backgroundInternalProperty.setNative, overriding it without calling `super` will prevent the background from ever being drawn.
     *  - `invalid` - the view background must be redrawn on the next layot.
     *  - `drawn` - the view background has been property drawn, on subsequent layouts it may need to be redrawn if the background depends on the view's size.
     */
    _nativeBackgroundState: 'unset' | 'invalid' | 'drawn';
    get isLayoutRequired(): boolean;
    get isLayoutRequested(): boolean;
    constructor();
    requestLayout(): void;
    measure(widthMeasureSpec: number, heightMeasureSpec: number): void;
    layout(left: number, top: number, right: number, bottom: number, setFrame?: boolean): void;
    private updateBackground;
    setMeasuredDimension(measuredWidth: number, measuredHeight: number): void;
    onMeasure(widthMeasureSpec: number, heightMeasureSpec: number): void;
    onLayout(left: number, top: number, right: number, bottom: number): void;
    _setNativeViewFrame(nativeView: UIView, frame: CGRect): void;
    get isLayoutValid(): boolean;
    layoutNativeView(left: number, top: number, right: number, bottom: number): void;
    _layoutParent(): void;
    _setLayoutFlags(left: number, top: number, right: number, bottom: number): void;
    focus(): boolean;
    protected applySafeAreaInsets(frame: CGRect): CGRect;
    getSafeAreaInsets(): {
        left: any;
        top: any;
        right: any;
        bottom: any;
    };
    getLocationInWindow(): Point;
    getLocationOnScreen(): Point;
    getLocationRelativeTo(otherView: ViewDefinition): Point;
    _onSizeChanged(): void;
    updateNativeTransform(): void;
    updateOriginPoint(originX: number, originY: number): void;
    _suspendPresentationLayerUpdates(): void;
    _resumePresentationLayerUpdates(): void;
    _isPresentationLayerUpdateSuspeneded(): boolean;
    protected _showNativeModalView(parent: View, options: ShowModalOptions): void;
    protected _hideNativeModalView(parent: View, whenClosedCallback: () => void): void;
    setTestID(view: any, value: string): void;
    sendAccessibilityEvent(options: Partial<AccessibilityEventOptions>): void;
    accessibilityAnnouncement(msg?: string): void;
    accessibilityScreenChanged(): void;
    _getCurrentLayoutBounds(): {
        left: number;
        top: number;
        right: number;
        bottom: number;
    };
    _redrawNativeBackground(value: UIColor | Background): void;
    _setNativeClipToBounds(): void;
    private _setupPopoverControllerDelegate;
    private _setupAdaptiveControllerDelegate;
}
export declare class ContainerView extends View {
    iosOverflowSafeArea: boolean;
    constructor();
}
export declare class CustomLayoutView extends ContainerView {
    nativeViewProtected: UIView;
    createNativeView(): UIView;
    get ios(): UIView;
    onMeasure(widthMeasureSpec: number, heightMeasureSpec: number): void;
    _addViewToNativeVisualTree(child: View, atIndex: number): boolean;
    _removeViewFromNativeVisualTree(child: View): void;
}
