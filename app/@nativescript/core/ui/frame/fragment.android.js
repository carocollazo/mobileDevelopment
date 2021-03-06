import { setFragmentCallbacks, setFragmentClass } from '.';
const superProto = org.nativescript.widgets.FragmentBase.prototype;
const FragmentClass = org.nativescript.widgets.FragmentBase.extend('com.tns.FragmentClass', {
    init() { },
    onHiddenChanged(hidden) {
        this._callbacks.onHiddenChanged(this, hidden, superProto.onHiddenChanged);
    },
    onCreateAnimator(transit, enter, nextAnim) {
        return this._callbacks.onCreateAnimator(this, transit, enter, nextAnim, superProto.onCreateAnimator);
    },
    onStop() {
        this._callbacks.onStop(this, superProto.onStop);
    },
    onPause() {
        this._callbacks.onPause(this, superProto.onPause);
    },
    onResume() {
        this._callbacks.onResume(this, superProto.onResume);
    },
    onCreate(savedInstanceState) {
        if (!this._callbacks) {
            setFragmentCallbacks(this);
        }
        this.setHasOptionsMenu(true);
        this._callbacks.onCreate(this, savedInstanceState, superProto.onCreate);
    },
    onCreateView(inflater, container, savedInstanceState) {
        const result = this._callbacks.onCreateView(this, inflater, container, savedInstanceState, superProto.onCreateView);
        return result;
    },
    onSaveInstanceState(outState) {
        this._callbacks.onSaveInstanceState(this, outState, superProto.onSaveInstanceState);
    },
    onDestroyView() {
        this._callbacks.onDestroyView(this, superProto.onDestroyView);
    },
    onDestroy() {
        this._callbacks.onDestroy(this, superProto.onDestroy);
    },
    toString() {
        const callbacks = this._callbacks;
        if (callbacks) {
            return callbacks.toStringOverride(this, superProto.toString);
        }
        else {
            superProto.toString();
        }
    },
});
setFragmentClass(FragmentClass);
//# sourceMappingURL=fragment.android.js.map