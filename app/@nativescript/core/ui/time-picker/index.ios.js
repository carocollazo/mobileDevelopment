import { TimePickerBase, timeProperty, minuteIntervalProperty, minuteProperty, minMinuteProperty, maxMinuteProperty, hourProperty, minHourProperty, maxHourProperty } from './time-picker-common';
import { Color } from '../../color';
import { colorProperty } from '../styling/style-properties';
import { Device } from '../../platform';
export * from './time-picker-common';
const SUPPORT_DATE_PICKER_STYLE = parseFloat(Device.osVersion) >= 13.4;
const SUPPORT_TEXT_COLOR = parseFloat(Device.osVersion) < 14.0;
function getDate(hour, minute) {
    const components = NSDateComponents.alloc().init();
    components.hour = hour;
    components.minute = minute;
    return NSCalendar.currentCalendar.dateFromComponents(components);
}
function getComponents(date) {
    return NSCalendar.currentCalendar.componentsFromDate(32 /* CalendarUnitHour */ | 64 /* CalendarUnitMinute */, date);
}
export class TimePicker extends TimePickerBase {
    constructor() {
        super();
        const components = getComponents(NSDate.date());
        this.hour = components.hour;
        this.minute = components.minute;
    }
    createNativeView() {
        const picker = UIDatePicker.new();
        picker.datePickerMode = 0 /* Time */;
        if (SUPPORT_DATE_PICKER_STYLE) {
            picker.preferredDatePickerStyle = this.iosPreferredDatePickerStyle;
        }
        return picker;
    }
    initNativeView() {
        super.initNativeView();
        this._changeHandler = UITimePickerChangeHandlerImpl.initWithOwner(new WeakRef(this));
        this.nativeViewProtected.addTargetActionForControlEvents(this._changeHandler, 'valueChanged', 4096 /* ValueChanged */);
    }
    disposeNativeView() {
        this._changeHandler = null;
        super.disposeNativeView();
    }
    // @ts-ignore
    get ios() {
        return this.nativeViewProtected;
    }
    [timeProperty.getDefault]() {
        return this.nativeViewProtected.date;
    }
    [timeProperty.setNative](value) {
        this.nativeViewProtected.date = getDate(this.hour, this.minute);
    }
    [minuteProperty.getDefault]() {
        return this.nativeViewProtected.date.getMinutes();
    }
    [minuteProperty.setNative](value) {
        this.nativeViewProtected.date = getDate(this.hour, value);
    }
    [hourProperty.getDefault]() {
        return this.nativeViewProtected.date.getHours();
    }
    [hourProperty.setNative](value) {
        this.nativeViewProtected.date = getDate(value, this.minute);
    }
    [minHourProperty.getDefault]() {
        return this.nativeViewProtected.minimumDate ? this.nativeViewProtected.minimumDate.getHours() : 0;
    }
    [minHourProperty.setNative](value) {
        this.nativeViewProtected.minimumDate = getDate(value, this.minute);
    }
    [maxHourProperty.getDefault]() {
        return this.nativeViewProtected.maximumDate ? this.nativeViewProtected.maximumDate.getHours() : 24;
    }
    [maxHourProperty.setNative](value) {
        this.nativeViewProtected.maximumDate = getDate(value, this.minute);
    }
    [minMinuteProperty.getDefault]() {
        return this.nativeViewProtected.minimumDate ? this.nativeViewProtected.minimumDate.getMinutes() : 0;
    }
    [minMinuteProperty.setNative](value) {
        this.nativeViewProtected.minimumDate = getDate(this.hour, value);
    }
    [maxMinuteProperty.getDefault]() {
        return this.nativeViewProtected.maximumDate ? this.nativeViewProtected.maximumDate.getMinutes() : 60;
    }
    [maxMinuteProperty.setNative](value) {
        this.nativeViewProtected.maximumDate = getDate(this.hour, value);
    }
    [minuteIntervalProperty.getDefault]() {
        return this.nativeViewProtected.minuteInterval;
    }
    [minuteIntervalProperty.setNative](value) {
        this.nativeViewProtected.minuteInterval = value;
    }
    [colorProperty.getDefault]() {
        return SUPPORT_TEXT_COLOR ? this.nativeViewProtected.valueForKey('textColor') : UIColor.new();
    }
    [colorProperty.setNative](value) {
        if (SUPPORT_TEXT_COLOR) {
            const color = value instanceof Color ? value.ios : value;
            this.nativeViewProtected.setValueForKey(color, 'textColor');
        }
    }
}
var UITimePickerChangeHandlerImpl = /** @class */ (function (_super) {
    __extends(UITimePickerChangeHandlerImpl, _super);
    function UITimePickerChangeHandlerImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    UITimePickerChangeHandlerImpl.initWithOwner = function (owner) {
        var handler = UITimePickerChangeHandlerImpl.new();
        handler._owner = owner;
        return handler;
    };
    UITimePickerChangeHandlerImpl.prototype.valueChanged = function (sender) {
        var owner = this._owner.get();
        if (!owner) {
            return;
        }
        var components = getComponents(sender.date);
        var timeChanged = false;
        if (components.hour !== owner.hour) {
            hourProperty.nativeValueChange(owner, components.hour);
            timeChanged = true;
        }
        if (components.minute !== owner.minute) {
            minuteProperty.nativeValueChange(owner, components.minute);
            timeChanged = true;
        }
        if (timeChanged) {
            timeProperty.nativeValueChange(owner, new Date(0, 0, 0, components.hour, components.minute));
        }
    };
    UITimePickerChangeHandlerImpl.ObjCExposedMethods = {
        valueChanged: { returns: interop.types.void, params: [UIDatePicker] },
    };
    return UITimePickerChangeHandlerImpl;
}(NSObject));
//# sourceMappingURL=index.ios.js.map