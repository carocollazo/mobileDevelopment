var TextView_1;
import { TextViewBase as TextViewBaseCommon, maxLinesProperty } from './text-view-common';
import { CSSType } from '../core/view';
export * from '../text-base';
let TextView = TextView_1 = class TextView extends TextViewBaseCommon {
    _configureEditText(editText) {
        editText.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_NORMAL | android.text.InputType.TYPE_TEXT_FLAG_CAP_SENTENCES | android.text.InputType.TYPE_TEXT_FLAG_MULTI_LINE | android.text.InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS);
        editText.setGravity(android.view.Gravity.TOP | android.view.Gravity.START);
    }
    resetNativeView() {
        super.resetNativeView();
        this.nativeTextViewProtected.setGravity(android.view.Gravity.TOP | android.view.Gravity.START);
    }
    [maxLinesProperty.getDefault]() {
        return 0;
    }
    [maxLinesProperty.setNative](value) {
        if (value <= 0) {
            this.nativeTextViewProtected.setMaxLines(Number.MAX_VALUE);
            return;
        }
        this.nativeTextViewProtected.setMaxLines(value);
    }
    _onReturnPress() {
        this.notify({ eventName: TextView_1.returnPressEvent, object: this });
    }
};
TextView = TextView_1 = __decorate([
    CSSType('TextView')
], TextView);
export { TextView };
TextView.prototype.recycleNativeView = 'auto';
//# sourceMappingURL=index.android.js.map