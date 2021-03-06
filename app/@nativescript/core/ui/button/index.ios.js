import { ControlStateChangeListener } from '../core/control-state-change';
import { ButtonBase } from './button-common';
import { View, PseudoClassHandler } from '../core/view';
import { backgroundColorProperty, borderTopWidthProperty, borderRightWidthProperty, borderBottomWidthProperty, borderLeftWidthProperty, paddingLeftProperty, paddingTopProperty, paddingRightProperty, paddingBottomProperty } from '../styling/style-properties';
import { textAlignmentProperty, whiteSpaceProperty } from '../text-base';
import { layout } from '../../utils';
import { Color } from '../../color';
export * from './button-common';
export class Button extends ButtonBase {
    createNativeView() {
        return UIButton.buttonWithType(1 /* System */);
    }
    initNativeView() {
        super.initNativeView();
        const nativeView = this.nativeViewProtected;
        this._tapHandler = TapHandlerImpl.initWithOwner(new WeakRef(this));
        nativeView.addTargetActionForControlEvents(this._tapHandler, 'tap', 64 /* TouchUpInside */);
    }
    disposeNativeView() {
        this._tapHandler = null;
        super.disposeNativeView();
    }
    // @ts-ignore
    get ios() {
        return this.nativeViewProtected;
    }
    onUnloaded() {
        super.onUnloaded();
        if (this._stateChangedHandler) {
            this._stateChangedHandler.stop();
        }
    }
    _updateButtonStateChangeHandler(subscribe) {
        if (subscribe) {
            if (!this._stateChangedHandler) {
                this._stateChangedHandler = new ControlStateChangeListener(this.nativeViewProtected, (s) => {
                    this._goToVisualState(s);
                });
            }
            this._stateChangedHandler.start();
        }
        else {
            this._stateChangedHandler.stop();
        }
    }
    [backgroundColorProperty.getDefault]() {
        return this.nativeViewProtected.backgroundColor;
    }
    [backgroundColorProperty.setNative](value) {
        this.nativeViewProtected.backgroundColor = value instanceof Color ? value.ios : value;
    }
    [borderTopWidthProperty.getDefault]() {
        return {
            value: this.nativeViewProtected.contentEdgeInsets.top,
            unit: 'px',
        };
    }
    [borderTopWidthProperty.setNative](value) {
        const inset = this.nativeViewProtected.contentEdgeInsets;
        const top = layout.toDeviceIndependentPixels(this.effectivePaddingTop + this.effectiveBorderTopWidth);
        this.nativeViewProtected.contentEdgeInsets = {
            top: top,
            left: inset.left,
            bottom: inset.bottom,
            right: inset.right,
        };
    }
    [borderRightWidthProperty.getDefault]() {
        return {
            value: this.nativeViewProtected.contentEdgeInsets.right,
            unit: 'px',
        };
    }
    [borderRightWidthProperty.setNative](value) {
        const inset = this.nativeViewProtected.contentEdgeInsets;
        const right = layout.toDeviceIndependentPixels(this.effectivePaddingRight + this.effectiveBorderRightWidth);
        this.nativeViewProtected.contentEdgeInsets = {
            top: inset.top,
            left: inset.left,
            bottom: inset.bottom,
            right: right,
        };
    }
    [borderBottomWidthProperty.getDefault]() {
        return {
            value: this.nativeViewProtected.contentEdgeInsets.bottom,
            unit: 'px',
        };
    }
    [borderBottomWidthProperty.setNative](value) {
        const inset = this.nativeViewProtected.contentEdgeInsets;
        const bottom = layout.toDeviceIndependentPixels(this.effectivePaddingBottom + this.effectiveBorderBottomWidth);
        this.nativeViewProtected.contentEdgeInsets = {
            top: inset.top,
            left: inset.left,
            bottom: bottom,
            right: inset.right,
        };
    }
    [borderLeftWidthProperty.getDefault]() {
        return {
            value: this.nativeViewProtected.contentEdgeInsets.left,
            unit: 'px',
        };
    }
    [borderLeftWidthProperty.setNative](value) {
        const inset = this.nativeViewProtected.contentEdgeInsets;
        const left = layout.toDeviceIndependentPixels(this.effectivePaddingLeft + this.effectiveBorderLeftWidth);
        this.nativeViewProtected.contentEdgeInsets = {
            top: inset.top,
            left: left,
            bottom: inset.bottom,
            right: inset.right,
        };
    }
    [paddingTopProperty.getDefault]() {
        return {
            value: this.nativeViewProtected.contentEdgeInsets.top,
            unit: 'px',
        };
    }
    [paddingTopProperty.setNative](value) {
        const inset = this.nativeViewProtected.contentEdgeInsets;
        const top = layout.toDeviceIndependentPixels(this.effectivePaddingTop + this.effectiveBorderTopWidth);
        this.nativeViewProtected.contentEdgeInsets = {
            top: top,
            left: inset.left,
            bottom: inset.bottom,
            right: inset.right,
        };
    }
    [paddingRightProperty.getDefault]() {
        return {
            value: this.nativeViewProtected.contentEdgeInsets.right,
            unit: 'px',
        };
    }
    [paddingRightProperty.setNative](value) {
        const inset = this.nativeViewProtected.contentEdgeInsets;
        const right = layout.toDeviceIndependentPixels(this.effectivePaddingRight + this.effectiveBorderRightWidth);
        this.nativeViewProtected.contentEdgeInsets = {
            top: inset.top,
            left: inset.left,
            bottom: inset.bottom,
            right: right,
        };
    }
    [paddingBottomProperty.getDefault]() {
        return {
            value: this.nativeViewProtected.contentEdgeInsets.bottom,
            unit: 'px',
        };
    }
    [paddingBottomProperty.setNative](value) {
        const inset = this.nativeViewProtected.contentEdgeInsets;
        const bottom = layout.toDeviceIndependentPixels(this.effectivePaddingBottom + this.effectiveBorderBottomWidth);
        this.nativeViewProtected.contentEdgeInsets = {
            top: inset.top,
            left: inset.left,
            bottom: bottom,
            right: inset.right,
        };
    }
    [paddingLeftProperty.getDefault]() {
        return {
            value: this.nativeViewProtected.contentEdgeInsets.left,
            unit: 'px',
        };
    }
    [paddingLeftProperty.setNative](value) {
        const inset = this.nativeViewProtected.contentEdgeInsets;
        const left = layout.toDeviceIndependentPixels(this.effectivePaddingLeft + this.effectiveBorderLeftWidth);
        this.nativeViewProtected.contentEdgeInsets = {
            top: inset.top,
            left: left,
            bottom: inset.bottom,
            right: inset.right,
        };
    }
    [textAlignmentProperty.setNative](value) {
        switch (value) {
            case 'left':
                this.nativeViewProtected.titleLabel.textAlignment = 0 /* Left */;
                this.nativeViewProtected.contentHorizontalAlignment = 1 /* Left */;
                break;
            case 'initial':
            case 'center':
                this.nativeViewProtected.titleLabel.textAlignment = 1 /* Center */;
                this.nativeViewProtected.contentHorizontalAlignment = 0 /* Center */;
                break;
            case 'right':
                this.nativeViewProtected.titleLabel.textAlignment = 2 /* Right */;
                this.nativeViewProtected.contentHorizontalAlignment = 2 /* Right */;
                break;
        }
    }
    [whiteSpaceProperty.setNative](value) {
        const nativeView = this.nativeViewProtected.titleLabel;
        switch (value) {
            case 'normal':
                nativeView.lineBreakMode = 0 /* ByWordWrapping */;
                nativeView.numberOfLines = 0;
                break;
            case 'nowrap':
            case 'initial':
                nativeView.lineBreakMode = 5 /* ByTruncatingMiddle */;
                nativeView.numberOfLines = 1;
                break;
        }
    }
    onMeasure(widthMeasureSpec, heightMeasureSpec) {
        // If there is text-wrap UIButton.sizeThatFits will return wrong result (not respecting the text wrap).
        // So fallback to original onMeasure if there is no text-wrap and use custom measure otherwise.
        if (!this.textWrap) {
            return super.onMeasure(widthMeasureSpec, heightMeasureSpec);
        }
        const nativeView = this.nativeViewProtected;
        if (nativeView) {
            const width = layout.getMeasureSpecSize(widthMeasureSpec);
            const widthMode = layout.getMeasureSpecMode(widthMeasureSpec);
            const height = layout.getMeasureSpecSize(heightMeasureSpec);
            const heightMode = layout.getMeasureSpecMode(heightMeasureSpec);
            const horizontalPadding = this.effectivePaddingLeft + this.effectiveBorderLeftWidth + this.effectivePaddingRight + this.effectiveBorderRightWidth;
            let verticalPadding = this.effectivePaddingTop + this.effectiveBorderTopWidth + this.effectivePaddingBottom + this.effectiveBorderBottomWidth;
            // The default button padding for UIButton - 6dip top and bottom.
            if (verticalPadding === 0) {
                verticalPadding = layout.toDevicePixels(12);
            }
            const desiredSize = layout.measureNativeView(nativeView.titleLabel, width - horizontalPadding, widthMode, height - verticalPadding, heightMode);
            desiredSize.width = desiredSize.width + horizontalPadding;
            desiredSize.height = desiredSize.height + verticalPadding;
            const measureWidth = Math.max(desiredSize.width, this.effectiveMinWidth);
            const measureHeight = Math.max(desiredSize.height, this.effectiveMinHeight);
            const widthAndState = View.resolveSizeAndState(measureWidth, width, widthMode, 0);
            const heightAndState = View.resolveSizeAndState(measureHeight, height, heightMode, 0);
            this.setMeasuredDimension(widthAndState, heightAndState);
        }
    }
}
__decorate([
    PseudoClassHandler('normal', 'highlighted', 'pressed', 'active'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Boolean]),
    __metadata("design:returntype", void 0)
], Button.prototype, "_updateButtonStateChangeHandler", null);
var TapHandlerImpl = /** @class */ (function (_super) {
    __extends(TapHandlerImpl, _super);
    function TapHandlerImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TapHandlerImpl.initWithOwner = function (owner) {
        var handler = TapHandlerImpl.new();
        handler._owner = owner;
        return handler;
    };
    TapHandlerImpl.prototype.tap = function (args) {
        // _owner is a {N} view which could get destroyed when a tap initiates (protect!)
        if (this._owner) {
            var owner = this._owner.get();
            if (owner) {
                owner._emit(ButtonBase.tapEvent);
            }
        }
    };
    TapHandlerImpl.ObjCExposedMethods = {
        tap: { returns: interop.types.void, params: [interop.types.id] },
    };
    return TapHandlerImpl;
}(NSObject));
//# sourceMappingURL=index.ios.js.map