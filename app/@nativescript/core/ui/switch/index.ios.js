import { SwitchBase, checkedProperty, offBackgroundColorProperty } from './switch-common';
import { colorProperty, backgroundColorProperty, backgroundInternalProperty } from '../styling/style-properties';
import { Color } from '../../color';
import { iOSNativeHelper, layout } from '../../utils';
export * from './switch-common';
const majorVersion = iOSNativeHelper.MajorVersion;
var SwitchChangeHandlerImpl = /** @class */ (function (_super) {
    __extends(SwitchChangeHandlerImpl, _super);
    function SwitchChangeHandlerImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    SwitchChangeHandlerImpl.initWithOwner = function (owner) {
        var handler = SwitchChangeHandlerImpl.new();
        handler._owner = owner;
        return handler;
    };
    SwitchChangeHandlerImpl.prototype.valueChanged = function (sender) {
        var owner = this._owner.get();
        if (owner) {
            checkedProperty.nativeValueChange(owner, sender.on);
        }
    };
    SwitchChangeHandlerImpl.ObjCExposedMethods = {
        valueChanged: { returns: interop.types.void, params: [UISwitch] },
    };
    return SwitchChangeHandlerImpl;
}(NSObject));
const zeroSize = { width: 0, height: 0 };
export class Switch extends SwitchBase {
    constructor() {
        super();
        this.width = 51;
        this.height = 31;
    }
    createNativeView() {
        return UISwitch.new();
    }
    initNativeView() {
        super.initNativeView();
        const nativeView = this.nativeViewProtected;
        this._handler = SwitchChangeHandlerImpl.initWithOwner(new WeakRef(this));
        nativeView.addTargetActionForControlEvents(this._handler, 'valueChanged', 4096 /* ValueChanged */);
    }
    disposeNativeView() {
        this._handler = null;
        super.disposeNativeView();
    }
    setNativeBackgroundColor(value) {
        if (value) {
            this.nativeViewProtected.onTintColor = value instanceof Color ? value.ios : value;
            this.nativeViewProtected.tintColor = value instanceof Color ? value.ios : value;
            this.nativeViewProtected.backgroundColor = value instanceof Color ? value.ios : value;
            this.nativeViewProtected.layer.cornerRadius = this.nativeViewProtected.frame.size.height / 2;
        }
        else {
            this.nativeViewProtected.onTintColor = null;
            this.nativeViewProtected.tintColor = null;
            this.nativeViewProtected.backgroundColor = null;
            this.nativeViewProtected.layer.cornerRadius = 0;
        }
    }
    _onCheckedPropertyChanged(newValue) {
        // only add :checked pseudo handling on supported iOS versions
        // ios <13 works but causes glitchy animations when toggling
        // so we decided to keep the old behavior on older versions.
        if (majorVersion >= 13) {
            super._onCheckedPropertyChanged(newValue);
            if (this.offBackgroundColor) {
                if (!newValue) {
                    this.setNativeBackgroundColor(this.offBackgroundColor);
                }
                else {
                    this.setNativeBackgroundColor(this.backgroundColor instanceof Color ? this.backgroundColor : new Color(this.backgroundColor));
                }
            }
        }
    }
    // @ts-ignore
    get ios() {
        return this.nativeViewProtected;
    }
    onMeasure(widthMeasureSpec, heightMeasureSpec) {
        // It can't be anything different from 51x31
        const nativeSize = this.nativeViewProtected.sizeThatFits(zeroSize);
        this.width = nativeSize.width;
        this.height = nativeSize.height;
        const widthAndState = Switch.resolveSizeAndState(layout.toDevicePixels(nativeSize.width), layout.toDevicePixels(51), layout.EXACTLY, 0);
        const heightAndState = Switch.resolveSizeAndState(layout.toDevicePixels(nativeSize.height), layout.toDevicePixels(31), layout.EXACTLY, 0);
        this.setMeasuredDimension(widthAndState, heightAndState);
    }
    [checkedProperty.getDefault]() {
        return false;
    }
    [checkedProperty.setNative](value) {
        this.nativeViewProtected.on = value;
    }
    [colorProperty.getDefault]() {
        return this.nativeViewProtected.thumbTintColor;
    }
    [colorProperty.setNative](value) {
        var _a;
        const color = value instanceof Color ? value.ios : value;
        this.nativeViewProtected.thumbTintColor = color;
        if (color && this.nativeViewProtected.subviews.count > 0) {
            const alpha = new interop.Reference(1.0);
            const res = color.getRedGreenBlueAlpha(null, null, null, alpha);
            this.nativeViewProtected.subviews[0].alpha = (_a = (res && alpha.value)) !== null && _a !== void 0 ? _a : 1;
        }
    }
    [backgroundColorProperty.getDefault]() {
        return this.nativeViewProtected.onTintColor;
    }
    [backgroundColorProperty.setNative](value) {
        if (majorVersion >= 13) {
            if (!this.offBackgroundColor || this.checked) {
                this.setNativeBackgroundColor(value);
            }
        }
        else {
            // old behavior on unsupported iOS versions
            this.nativeViewProtected.onTintColor = value instanceof Color ? value.ios : value;
        }
    }
    [backgroundInternalProperty.getDefault]() {
        return null;
    }
    [backgroundInternalProperty.setNative](value) {
        //
    }
    [offBackgroundColorProperty.getDefault]() {
        return this.nativeViewProtected.backgroundColor;
    }
    [offBackgroundColorProperty.setNative](value) {
        if (majorVersion >= 13) {
            if (!this.checked) {
                this.setNativeBackgroundColor(value);
            }
        }
        else {
            // old behavior on unsupported iOS versions...
            const nativeValue = value instanceof Color ? value.ios : value;
            this.nativeViewProtected.tintColor = nativeValue;
            this.nativeViewProtected.backgroundColor = nativeValue;
            this.nativeViewProtected.layer.cornerRadius = this.nativeViewProtected.frame.size.height / 2;
        }
    }
}
//# sourceMappingURL=index.ios.js.map