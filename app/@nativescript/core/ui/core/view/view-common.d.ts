import { View as ViewDefinition, Point, Size } from '.';
import { ShowModalOptions, ViewBase } from '../view-base';
import { Color } from '../../../color';
import { Property, InheritedProperty } from '../properties';
import { EventData } from '../../../data/observable';
import { CoreTypes } from '../../../core-types';
import { GesturesObserver, GestureTypes, GestureEventData, TouchAnimationOptions } from '../../gestures';
import { LinearGradient } from '../../styling/linear-gradient';
import * as am from '../../animation';
import { AccessibilityEventOptions, AccessibilityLiveRegion, AccessibilityRole, AccessibilityState } from '../../../accessibility/accessibility-types';
import { CSSShadow } from '../../styling/css-shadow';
export * from './view-helper';
export declare function CSSType(type: string): ClassDecorator;
export declare function viewMatchesModuleContext(view: ViewDefinition, context: ModuleContext, types: ModuleType[]): boolean;
export declare function PseudoClassHandler(...pseudoClasses: string[]): MethodDecorator;
export declare const _rootModalViews: ViewBase[];
export declare abstract class ViewCommon extends ViewBase implements ViewDefinition {
    static layoutChangedEvent: string;
    static shownModallyEvent: string;
    static showingModallyEvent: string;
    static accessibilityBlurEvent: string;
    static accessibilityFocusEvent: string;
    static accessibilityFocusChangedEvent: string;
    static accessibilityPerformEscapeEvent: string;
    accessibilityIdentifier: string;
    accessibilityLabel: string;
    accessibilityValue: string;
    accessibilityHint: string;
    testID: string;
    touchAnimation: boolean | TouchAnimationOptions;
    ignoreTouchAnimation: boolean;
    protected _closeModalCallback: Function;
    _manager: any;
    _modalParent: ViewCommon;
    private _modalContext;
    private _modal;
    private _measuredWidth;
    private _measuredHeight;
    protected _isLayoutValid: boolean;
    private _cssType;
    private _localAnimations;
    _currentWidthMeasureSpec: number;
    _currentHeightMeasureSpec: number;
    _setMinWidthNative: (value: CoreTypes.LengthType) => void;
    _setMinHeightNative: (value: CoreTypes.LengthType) => void;
    _gestureObservers: {};
    _androidContentDescriptionUpdated?: boolean;
    get css(): string;
    set css(value: string);
    addCss(cssString: string): void;
    addCssFile(cssFileName: string): void;
    changeCssFile(cssFileName: string): void;
    _updateStyleScope(cssFileName?: string, cssString?: string, css?: string): void;
    private setScopeProperty;
    onLoaded(): void;
    _closeAllModalViewsInternal(): boolean;
    _getRootModalViews(): Array<ViewBase>;
    _onLivesync(context?: ModuleContext): boolean;
    _handleLivesync(context?: ModuleContext): boolean;
    _setupAsRootView(context: any): void;
    _observe(type: GestureTypes, callback: (args: GestureEventData) => void, thisArg?: any): void;
    getGestureObservers(type: GestureTypes): Array<GesturesObserver>;
    addEventListener(arg: string | GestureTypes, callback: (data: EventData) => void, thisArg?: any): void;
    removeEventListener(arg: string | GestureTypes, callback?: any, thisArg?: any): void;
    onBackPressed(): boolean;
    _getFragmentManager(): any;
    private getModalOptions;
    showModal(...args: any[]): ViewDefinition;
    closeModal(...args: any[]): void;
    get modal(): ViewCommon;
    protected _showNativeModalView(parent: ViewCommon, options: ShowModalOptions): void;
    protected _hideNativeModalView(parent: ViewCommon, whenClosedCallback: () => void): void;
    protected _raiseLayoutChangedEvent(): void;
    protected _raiseShownModallyEvent(): void;
    protected _raiseShowingModallyEvent(): void;
    private _isEvent;
    private _disconnectGestureObservers;
    get borderColor(): string | Color;
    set borderColor(value: string | Color);
    get borderTopColor(): Color;
    set borderTopColor(value: Color);
    get borderRightColor(): Color;
    set borderRightColor(value: Color);
    get borderBottomColor(): Color;
    set borderBottomColor(value: Color);
    get borderLeftColor(): Color;
    set borderLeftColor(value: Color);
    get borderWidth(): string | CoreTypes.LengthType;
    set borderWidth(value: string | CoreTypes.LengthType);
    get borderTopWidth(): CoreTypes.LengthType;
    set borderTopWidth(value: CoreTypes.LengthType);
    get borderRightWidth(): CoreTypes.LengthType;
    set borderRightWidth(value: CoreTypes.LengthType);
    get borderBottomWidth(): CoreTypes.LengthType;
    set borderBottomWidth(value: CoreTypes.LengthType);
    get borderLeftWidth(): CoreTypes.LengthType;
    set borderLeftWidth(value: CoreTypes.LengthType);
    get borderRadius(): string | CoreTypes.LengthType;
    set borderRadius(value: string | CoreTypes.LengthType);
    get borderTopLeftRadius(): CoreTypes.LengthType;
    set borderTopLeftRadius(value: CoreTypes.LengthType);
    get borderTopRightRadius(): CoreTypes.LengthType;
    set borderTopRightRadius(value: CoreTypes.LengthType);
    get borderBottomRightRadius(): CoreTypes.LengthType;
    set borderBottomRightRadius(value: CoreTypes.LengthType);
    get borderBottomLeftRadius(): CoreTypes.LengthType;
    set borderBottomLeftRadius(value: CoreTypes.LengthType);
    get color(): Color;
    set color(value: Color);
    get background(): string;
    set background(value: string);
    get backgroundColor(): Color;
    set backgroundColor(value: Color);
    get backgroundImage(): string | LinearGradient;
    set backgroundImage(value: string | LinearGradient);
    get backgroundSize(): string;
    set backgroundSize(value: string);
    get backgroundPosition(): string;
    set backgroundPosition(value: string);
    get backgroundRepeat(): CoreTypes.BackgroundRepeatType;
    set backgroundRepeat(value: CoreTypes.BackgroundRepeatType);
    get boxShadow(): CSSShadow;
    set boxShadow(value: CSSShadow);
    get minWidth(): CoreTypes.LengthType;
    set minWidth(value: CoreTypes.LengthType);
    get minHeight(): CoreTypes.LengthType;
    set minHeight(value: CoreTypes.LengthType);
    get width(): CoreTypes.PercentLengthType;
    set width(value: CoreTypes.PercentLengthType);
    get height(): CoreTypes.PercentLengthType;
    set height(value: CoreTypes.PercentLengthType);
    get margin(): string | CoreTypes.PercentLengthType;
    set margin(value: string | CoreTypes.PercentLengthType);
    get marginLeft(): CoreTypes.PercentLengthType;
    set marginLeft(value: CoreTypes.PercentLengthType);
    get marginTop(): CoreTypes.PercentLengthType;
    set marginTop(value: CoreTypes.PercentLengthType);
    get marginRight(): CoreTypes.PercentLengthType;
    set marginRight(value: CoreTypes.PercentLengthType);
    get marginBottom(): CoreTypes.PercentLengthType;
    set marginBottom(value: CoreTypes.PercentLengthType);
    get horizontalAlignment(): CoreTypes.HorizontalAlignmentType;
    set horizontalAlignment(value: CoreTypes.HorizontalAlignmentType);
    get verticalAlignment(): CoreTypes.VerticalAlignmentType;
    set verticalAlignment(value: CoreTypes.VerticalAlignmentType);
    get visibility(): CoreTypes.VisibilityType;
    set visibility(value: CoreTypes.VisibilityType);
    get opacity(): number;
    set opacity(value: number);
    get rotate(): number;
    set rotate(value: number);
    get rotateX(): number;
    set rotateX(value: number);
    get rotateY(): number;
    set rotateY(value: number);
    get perspective(): number;
    set perspective(value: number);
    get textTransform(): CoreTypes.TextTransformType;
    set textTransform(value: CoreTypes.TextTransformType);
    get translateX(): CoreTypes.dip;
    set translateX(value: CoreTypes.dip);
    get translateY(): CoreTypes.dip;
    set translateY(value: CoreTypes.dip);
    get scaleX(): number;
    set scaleX(value: number);
    get scaleY(): number;
    set scaleY(value: number);
    get accessible(): boolean;
    set accessible(value: boolean);
    get accessibilityHidden(): boolean;
    set accessibilityHidden(value: boolean);
    get accessibilityRole(): AccessibilityRole;
    set accessibilityRole(value: AccessibilityRole);
    get accessibilityState(): AccessibilityState;
    set accessibilityState(value: AccessibilityState);
    get accessibilityLiveRegion(): AccessibilityLiveRegion;
    set accessibilityLiveRegion(value: AccessibilityLiveRegion);
    get accessibilityLanguage(): string;
    set accessibilityLanguage(value: string);
    get accessibilityMediaSession(): boolean;
    set accessibilityMediaSession(value: boolean);
    get automationText(): string;
    set automationText(value: string);
    get androidElevation(): number;
    set androidElevation(value: number);
    get androidDynamicElevationOffset(): number;
    set androidDynamicElevationOffset(value: number);
    originX: number;
    originY: number;
    isEnabled: boolean;
    isUserInteractionEnabled: boolean;
    iosOverflowSafeArea: boolean;
    iosOverflowSafeAreaEnabled: boolean;
    iosIgnoreSafeArea: boolean;
    get isLayoutValid(): boolean;
    get cssType(): string;
    set cssType(type: string);
    get isLayoutRequired(): boolean;
    measure(widthMeasureSpec: number, heightMeasureSpec: number): void;
    layout(left: number, top: number, right: number, bottom: number): void;
    getMeasuredWidth(): number;
    getMeasuredHeight(): number;
    getMeasuredState(): number;
    setMeasuredDimension(measuredWidth: number, measuredHeight: number): void;
    requestLayout(): void;
    abstract onMeasure(widthMeasureSpec: number, heightMeasureSpec: number): void;
    abstract onLayout(left: number, top: number, right: number, bottom: number): void;
    abstract layoutNativeView(left: number, top: number, right: number, bottom: number): void;
    static resolveSizeAndState(size: number, specSize: number, specMode: number, childMeasuredState: number): number;
    static combineMeasuredStates(curState: number, newState: any): number;
    static layoutChild(parent: ViewDefinition, child: ViewDefinition, left: number, top: number, right: number, bottom: number, setFrame?: boolean): void;
    static measureChild(parent: ViewCommon, child: ViewCommon, widthMeasureSpec: number, heightMeasureSpec: number): {
        measuredWidth: number;
        measuredHeight: number;
    };
    _setCurrentMeasureSpecs(widthMeasureSpec: number, heightMeasureSpec: number): boolean;
    _getCurrentLayoutBounds(): {
        left: number;
        top: number;
        right: number;
        bottom: number;
    };
    /**
     * Returns two booleans - the first if "boundsChanged" the second is "sizeChanged".
     */
    _setCurrentLayoutBounds(left: number, top: number, right: number, bottom: number): {
        boundsChanged: boolean;
        sizeChanged: boolean;
    };
    eachChild(callback: (child: ViewBase) => boolean): void;
    eachChildView(callback: (view: ViewDefinition) => boolean): void;
    _getNativeViewsCount(): number;
    _eachLayoutView(callback: (View: any) => void): void;
    focus(): boolean;
    getSafeAreaInsets(): {
        left: any;
        top: any;
        right: any;
        bottom: any;
    };
    getLocationInWindow(): Point;
    getLocationOnScreen(): Point;
    getLocationRelativeTo(otherView: ViewDefinition): Point;
    getActualSize(): Size;
    animate(animation: any): am.AnimationPromise;
    createAnimation(animation: any): am.Animation;
    _removeAnimation(animation: am.Animation): boolean;
    resetNativeView(): void;
    _setNativeViewFrame(nativeView: any, frame: any): void;
    _getValue(): never;
    _setValue(): never;
    _updateEffectiveLayoutValues(parentWidthMeasureSize: number, parentWidthMeasureMode: number, parentHeightMeasureSize: number, parentHeightMeasureMode: number): void;
    _setNativeClipToBounds(): void;
    _redrawNativeBackground(value: any): void;
    _applyBackground(background: any, isBorderDrawable: boolean, onlyColor: boolean, backgroundDrawable: any): void;
    _onAttachedToWindow(): void;
    _onDetachedFromWindow(): void;
    _hasAncestorView(ancestorView: ViewDefinition): boolean;
    sendAccessibilityEvent(options: Partial<AccessibilityEventOptions>): void;
    accessibilityAnnouncement(msg?: string): void;
    accessibilityScreenChanged(): void;
    setTestID(view: any, value: string): void;
}
export declare const originXProperty: Property<ViewCommon, number>;
export declare const originYProperty: Property<ViewCommon, number>;
export declare const isEnabledProperty: Property<ViewCommon, boolean>;
export declare const isUserInteractionEnabledProperty: Property<ViewCommon, boolean>;
export declare const iosOverflowSafeAreaProperty: Property<ViewCommon, boolean>;
export declare const iosOverflowSafeAreaEnabledProperty: InheritedProperty<ViewCommon, boolean>;
export declare const iosIgnoreSafeAreaProperty: InheritedProperty<ViewBase, boolean>;
export declare const testIDProperty: Property<ViewCommon, string>;