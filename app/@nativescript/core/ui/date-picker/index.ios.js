import { DatePickerBase, yearProperty, monthProperty, dayProperty, dateProperty, maxDateProperty, minDateProperty, hourProperty, minuteProperty, secondProperty, showTimeProperty, iosPreferredDatePickerStyleProperty } from './date-picker-common';
import { colorProperty } from '../styling/style-properties';
import { Color } from '../../color';
import { Device } from '../../platform';
export * from './date-picker-common';
const SUPPORT_DATE_PICKER_STYLE = parseFloat(Device.osVersion) >= 13.4;
const SUPPORT_TEXT_COLOR = parseFloat(Device.osVersion) < 14.0;
export class DatePicker extends DatePickerBase {
    createNativeView() {
        const picker = UIDatePicker.new();
        picker.datePickerMode = this.showTime ? 2 /* DateAndTime */ : 1 /* Date */;
        if (SUPPORT_DATE_PICKER_STYLE) {
            picker.preferredDatePickerStyle = this.iosPreferredDatePickerStyle;
        }
        return picker;
    }
    initNativeView() {
        super.initNativeView();
        const nativeView = this.nativeViewProtected;
        this._changeHandler = UIDatePickerChangeHandlerImpl.initWithOwner(new WeakRef(this));
        nativeView.addTargetActionForControlEvents(this._changeHandler, 'valueChanged', 4096 /* ValueChanged */);
    }
    disposeNativeView() {
        this._changeHandler = null;
        super.disposeNativeView();
    }
    // @ts-ignore
    get ios() {
        return this.nativeViewProtected;
    }
    [showTimeProperty.setNative](value) {
        this.showTime = value;
        if (this.nativeViewProtected) {
            this.nativeViewProtected.datePickerMode = this.showTime ? 2 /* DateAndTime */ : 1 /* Date */;
        }
    }
    [iosPreferredDatePickerStyleProperty.setNative](value) {
        this.iosPreferredDatePickerStyle = value;
        if (this.nativeViewProtected) {
            if (SUPPORT_DATE_PICKER_STYLE) {
                this.nativeViewProtected.preferredDatePickerStyle = this.iosPreferredDatePickerStyle;
            }
        }
    }
    [yearProperty.setNative](value) {
        this.date = new Date(value, this.month - 1, this.day, this.hour || 0, this.minute || 0, this.second || 0);
    }
    [monthProperty.setNative](value) {
        this.date = new Date(this.year, value - 1, this.day, this.hour || 0, this.minute || 0, this.second || 0);
    }
    [dayProperty.setNative](value) {
        this.date = new Date(this.year, this.month - 1, value, this.hour || 0, this.minute || 0, this.second || 0);
    }
    [hourProperty.setNative](value) {
        this.date = new Date(this.year, this.month - 1, this.day, value, this.minute || 0, this.second || 0);
    }
    [minuteProperty.setNative](value) {
        this.date = new Date(this.year, this.month - 1, this.day, this.hour || 0, value, this.second || 0);
    }
    [secondProperty.setNative](value) {
        this.date = new Date(this.year, this.month - 1, this.day, this.hour || 0, this.minute || 0, value);
    }
    [dateProperty.setNative](value) {
        const picker = this.nativeViewProtected;
        const comps = NSCalendar.currentCalendar.componentsFromDate(4 /* CalendarUnitYear */ | 8 /* CalendarUnitMonth */ | 16 /* CalendarUnitDay */ | 32 /* HourCalendarUnit */ | 64 /* MinuteCalendarUnit */ | 128 /* SecondCalendarUnit */, picker.date);
        comps.year = value.getFullYear();
        comps.month = value.getMonth() + 1;
        comps.day = value.getDate();
        comps.hour = value.getHours();
        comps.minute = value.getMinutes();
        comps.second = value.getSeconds();
        this.year = comps.year;
        this.month = comps.month;
        this.day = comps.day;
        this.hour = comps.hour;
        this.minute = comps.minute;
        this.second = comps.second;
        picker.setDateAnimated(NSCalendar.currentCalendar.dateFromComponents(comps), false);
    }
    [maxDateProperty.getDefault]() {
        return this.nativeViewProtected.maximumDate;
    }
    [maxDateProperty.setNative](value) {
        const picker = this.nativeViewProtected;
        const nsDate = NSDate.dateWithTimeIntervalSince1970(value.getTime() / 1000);
        picker.maximumDate = nsDate;
    }
    [minDateProperty.getDefault]() {
        return this.nativeViewProtected.minimumDate;
    }
    [minDateProperty.setNative](value) {
        const picker = this.nativeViewProtected;
        const nsDate = NSDate.dateWithTimeIntervalSince1970(value.getTime() / 1000);
        picker.minimumDate = nsDate;
    }
    [colorProperty.getDefault]() {
        return SUPPORT_TEXT_COLOR ? this.nativeViewProtected.valueForKey('textColor') : UIColor.new();
    }
    [colorProperty.setNative](value) {
        if (SUPPORT_TEXT_COLOR) {
            const picker = this.nativeViewProtected;
            picker.setValueForKey(value instanceof Color ? value.ios : value, 'textColor');
        }
    }
}
var UIDatePickerChangeHandlerImpl = /** @class */ (function (_super) {
    __extends(UIDatePickerChangeHandlerImpl, _super);
    function UIDatePickerChangeHandlerImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    UIDatePickerChangeHandlerImpl.initWithOwner = function (owner) {
        var impl = UIDatePickerChangeHandlerImpl.new();
        impl._owner = owner;
        return impl;
    };
    UIDatePickerChangeHandlerImpl.prototype.valueChanged = function (sender) {
        var owner = this._owner.get();
        if (!owner) {
            return;
        }
        var comps = NSCalendar.currentCalendar.componentsFromDate(NSCalendarUnit.CalendarUnitYear | NSCalendarUnit.CalendarUnitMonth | NSCalendarUnit.CalendarUnitDay | NSCalendarUnit.HourCalendarUnit | NSCalendarUnit.MinuteCalendarUnit | NSCalendarUnit.SecondCalendarUnit, sender.date);
        var dateChanged = false;
        if (comps.year !== owner.year) {
            yearProperty.nativeValueChange(owner, comps.year);
            dateChanged = true;
        }
        if (comps.month !== owner.month) {
            monthProperty.nativeValueChange(owner, comps.month);
            dateChanged = true;
        }
        if (comps.day !== owner.day) {
            dayProperty.nativeValueChange(owner, comps.day);
            dateChanged = true;
        }
        if (comps.hour !== owner.hour) {
            hourProperty.nativeValueChange(owner, comps.hour);
            dateChanged = true;
        }
        if (comps.minute !== owner.minute) {
            minuteProperty.nativeValueChange(owner, comps.minute);
            dateChanged = true;
        }
        if (comps.second !== owner.second) {
            secondProperty.nativeValueChange(owner, comps.second);
            dateChanged = true;
        }
        if (dateChanged) {
            dateProperty.nativeValueChange(owner, new Date(comps.year, comps.month - 1, comps.day, comps.hour, comps.minute, comps.second));
        }
    };
    UIDatePickerChangeHandlerImpl.ObjCExposedMethods = {
        valueChanged: { returns: interop.types.void, params: [UIDatePicker] },
    };
    return UIDatePickerChangeHandlerImpl;
}(NSObject));
//# sourceMappingURL=index.ios.js.map