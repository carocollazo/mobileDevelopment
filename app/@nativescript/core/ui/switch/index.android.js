import { SwitchBase, checkedProperty, offBackgroundColorProperty } from './switch-common';
import { colorProperty, backgroundColorProperty, backgroundInternalProperty } from '../styling/style-properties';
import { Color } from '../../color';
export * from './switch-common';
let CheckedChangeListener;
function initializeCheckedChangeListener() {
    if (CheckedChangeListener) {
        return;
    }
    var CheckedChangeListenerImpl = /** @class */ (function (_super) {
    __extends(CheckedChangeListenerImpl, _super);
    function CheckedChangeListenerImpl(owner) {
        var _this = _super.call(this) || this;
        _this.owner = owner;
        return global.__native(_this);
    }
    CheckedChangeListenerImpl.prototype.onCheckedChanged = function (buttonView, isChecked) {
        var owner = this.owner;
        checkedProperty.nativeValueChange(owner, isChecked);
    };
    CheckedChangeListenerImpl = __decorate([
        Interfaces([android.widget.CompoundButton.OnCheckedChangeListener])
    ], CheckedChangeListenerImpl);
    return CheckedChangeListenerImpl;
}(java.lang.Object));
    CheckedChangeListener = CheckedChangeListenerImpl;
}
export class Switch extends SwitchBase {
    createNativeView() {
        return new android.widget.Switch(this._context);
    }
    initNativeView() {
        super.initNativeView();
        const nativeView = this.nativeViewProtected;
        initializeCheckedChangeListener();
        const listener = new CheckedChangeListener(this);
        nativeView.setOnCheckedChangeListener(listener);
        nativeView.listener = listener;
    }
    disposeNativeView() {
        const nativeView = this.nativeViewProtected;
        nativeView.listener.owner = null;
        super.disposeNativeView();
    }
    setNativeBackgroundColor(value) {
        if (value instanceof Color) {
            // todo: use https://developer.android.com/reference/androidx/core/graphics/BlendModeColorFilterCompat
            this.nativeViewProtected.getTrackDrawable().setColorFilter(value.android, android.graphics.PorterDuff.Mode.SRC_OVER);
        }
        else {
            this.nativeViewProtected.getTrackDrawable().clearColorFilter();
        }
    }
    _onCheckedPropertyChanged(newValue) {
        super._onCheckedPropertyChanged(newValue);
        if (this.offBackgroundColor) {
            if (!newValue) {
                this.setNativeBackgroundColor(this.offBackgroundColor);
            }
            else {
                this.setNativeBackgroundColor(this.backgroundColor);
            }
        }
    }
    [checkedProperty.getDefault]() {
        return false;
    }
    [checkedProperty.setNative](value) {
        this.nativeViewProtected.setChecked(value);
    }
    [colorProperty.getDefault]() {
        return -1;
    }
    [colorProperty.setNative](value) {
        if (value instanceof Color) {
            // todo: use https://developer.android.com/reference/androidx/core/graphics/BlendModeColorFilterCompat
            this.nativeViewProtected.getThumbDrawable().setColorFilter(value.android, android.graphics.PorterDuff.Mode.SRC_ATOP);
        }
        else {
            this.nativeViewProtected.getThumbDrawable().clearColorFilter();
        }
    }
    [backgroundColorProperty.getDefault]() {
        return -1;
    }
    [backgroundColorProperty.setNative](value) {
        if (!this.offBackgroundColor || this.checked) {
            this.setNativeBackgroundColor(value);
        }
    }
    [backgroundInternalProperty.getDefault]() {
        return null;
    }
    [backgroundInternalProperty.setNative](value) {
        //
    }
    [offBackgroundColorProperty.getDefault]() {
        return -1;
    }
    [offBackgroundColorProperty.setNative](value) {
        if (!this.checked) {
            this.setNativeBackgroundColor(value);
        }
    }
}
//# sourceMappingURL=index.android.js.map