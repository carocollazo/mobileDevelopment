import { View } from '../core/view';
// Types.
import { GesturesObserverBase, toString, TouchAction, GestureStateTypes, GestureTypes, SwipeDirection, GestureEvents } from './gestures-common';
// Import layout from utils directly to avoid circular references
import { layout } from '../../utils';
import * as timer from '../../timer';
export * from './gestures-common';
let TapAndDoubleTapGestureListener;
function initializeTapAndDoubleTapGestureListener() {
    if (TapAndDoubleTapGestureListener) {
        return;
    }
    var TapAndDoubleTapGestureListenerImpl = /** @class */ (function (_super) {
    __extends(TapAndDoubleTapGestureListenerImpl, _super);
    function TapAndDoubleTapGestureListenerImpl(observer, target, type) {
        var _this = _super.call(this) || this;
        _this._lastUpTime = 0;
        _this._observer = observer;
        _this._target = target;
        _this._type = type;
        return global.__native(_this);
    }
    TapAndDoubleTapGestureListenerImpl.prototype.onSingleTapUp = function (motionEvent) {
        this._handleSingleTap(motionEvent);
        this._lastUpTime = Date.now();
        return true;
    };
    TapAndDoubleTapGestureListenerImpl.prototype.onDown = function (motionEvent) {
        var tapTime = Date.now();
        if (tapTime - this._lastUpTime <= TapAndDoubleTapGestureListenerImpl.DoubleTapTimeout) {
            this._handleDoubleTap(motionEvent);
        }
        return true;
    };
    TapAndDoubleTapGestureListenerImpl.prototype.onLongPress = function (motionEvent) {
        if (this._type & GestureTypes.longPress) {
            var args = _getLongPressArgs(GestureTypes.longPress, this._target, GestureStateTypes.began, motionEvent);
            _executeCallback(this._observer, args);
        }
    };
    TapAndDoubleTapGestureListenerImpl.prototype._handleSingleTap = function (motionEvent) {
        var _this = this;
        if (this._target.getGestureObservers(GestureTypes.doubleTap)) {
            this._tapTimeoutId = timer.setTimeout(function () {
                if (_this._type & GestureTypes.tap) {
                    var args = _getTapArgs(GestureTypes.tap, _this._target, motionEvent);
                    _executeCallback(_this._observer, args);
                }
                timer.clearTimeout(_this._tapTimeoutId);
            }, TapAndDoubleTapGestureListenerImpl.DoubleTapTimeout);
        }
        else {
            if (this._type & GestureTypes.tap) {
                var args = _getTapArgs(GestureTypes.tap, this._target, motionEvent);
                _executeCallback(this._observer, args);
            }
        }
    };
    TapAndDoubleTapGestureListenerImpl.prototype._handleDoubleTap = function (motionEvent) {
        if (this._tapTimeoutId) {
            timer.clearTimeout(this._tapTimeoutId);
        }
        if (this._type & GestureTypes.doubleTap) {
            var args = _getTapArgs(GestureTypes.doubleTap, this._target, motionEvent);
            _executeCallback(this._observer, args);
        }
    };
    TapAndDoubleTapGestureListenerImpl.DoubleTapTimeout = android.view.ViewConfiguration.getDoubleTapTimeout();
    return TapAndDoubleTapGestureListenerImpl;
}(android.view.GestureDetector.SimpleOnGestureListener));
    TapAndDoubleTapGestureListener = TapAndDoubleTapGestureListenerImpl;
}
let PinchGestureListener;
function initializePinchGestureListener() {
    if (PinchGestureListener) {
        return;
    }
    var PinchGestureListenerImpl = /** @class */ (function (_super) {
    __extends(PinchGestureListenerImpl, _super);
    function PinchGestureListenerImpl(observer, target) {
        var _this = _super.call(this) || this;
        _this._observer = observer;
        _this._target = target;
        return global.__native(_this);
    }
    PinchGestureListenerImpl.prototype.onScaleBegin = function (detector) {
        this._scale = detector.getScaleFactor();
        var args = new PinchGestureEventData(this._target, detector, this._scale, this._target, GestureStateTypes.began);
        _executeCallback(this._observer, args);
        return true;
    };
    PinchGestureListenerImpl.prototype.onScale = function (detector) {
        this._scale *= detector.getScaleFactor();
        var args = new PinchGestureEventData(this._target, detector, this._scale, this._target, GestureStateTypes.changed);
        _executeCallback(this._observer, args);
        return true;
    };
    PinchGestureListenerImpl.prototype.onScaleEnd = function (detector) {
        this._scale *= detector.getScaleFactor();
        var args = new PinchGestureEventData(this._target, detector, this._scale, this._target, GestureStateTypes.ended);
        _executeCallback(this._observer, args);
    };
    return PinchGestureListenerImpl;
}(android.view.ScaleGestureDetector.SimpleOnScaleGestureListener));
    PinchGestureListener = PinchGestureListenerImpl;
}
let SwipeGestureListener;
function initializeSwipeGestureListener() {
    if (SwipeGestureListener) {
        return;
    }
    var SwipeGestureListenerImpl = /** @class */ (function (_super) {
    __extends(SwipeGestureListenerImpl, _super);
    function SwipeGestureListenerImpl(observer, target) {
        var _this = _super.call(this) || this;
        _this._observer = observer;
        _this._target = target;
        return global.__native(_this);
    }
    SwipeGestureListenerImpl.prototype.onDown = function (motionEvent) {
        return true;
    };
    SwipeGestureListenerImpl.prototype.onFling = function (initialEvent, currentEvent, velocityX, velocityY) {
        var result = false;
        var args;
        try {
            var deltaY = currentEvent.getY() - initialEvent.getY();
            var deltaX = currentEvent.getX() - initialEvent.getX();
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                if (Math.abs(deltaX) > SWIPE_THRESHOLD && Math.abs(velocityX) > SWIPE_VELOCITY_THRESHOLD) {
                    if (deltaX > 0) {
                        args = _getSwipeArgs(SwipeDirection.right, this._target, initialEvent, currentEvent);
                        _executeCallback(this._observer, args);
                        result = true;
                    }
                    else {
                        args = _getSwipeArgs(SwipeDirection.left, this._target, initialEvent, currentEvent);
                        _executeCallback(this._observer, args);
                        result = true;
                    }
                }
            }
            else {
                if (Math.abs(deltaY) > SWIPE_THRESHOLD && Math.abs(velocityY) > SWIPE_VELOCITY_THRESHOLD) {
                    if (deltaY > 0) {
                        args = _getSwipeArgs(SwipeDirection.down, this._target, initialEvent, currentEvent);
                        _executeCallback(this._observer, args);
                        result = true;
                    }
                    else {
                        args = _getSwipeArgs(SwipeDirection.up, this._target, initialEvent, currentEvent);
                        _executeCallback(this._observer, args);
                        result = true;
                    }
                }
            }
        }
        catch (ex) {
            //
        }
        return result;
    };
    return SwipeGestureListenerImpl;
}(android.view.GestureDetector.SimpleOnGestureListener));
    SwipeGestureListener = SwipeGestureListenerImpl;
}
const SWIPE_THRESHOLD = 100;
const SWIPE_VELOCITY_THRESHOLD = 100;
const INVALID_POINTER_ID = -1;
const TO_DEGREES = 180 / Math.PI;
export function observe(target, type, callback, context) {
    const observer = new GesturesObserver(target, callback, context);
    observer.observe(type);
    return observer;
}
export class GesturesObserver extends GesturesObserverBase {
    observe(type) {
        if (this.target) {
            this.type = type;
            this._onTargetLoaded = (args) => {
                this._attach(this.target, type);
            };
            this._onTargetUnloaded = (args) => {
                this._detach();
            };
            this.target.on('loaded', this._onTargetLoaded);
            this.target.on('unloaded', this._onTargetUnloaded);
            if (this.target.isLoaded) {
                this._attach(this.target, type);
            }
        }
    }
    disconnect() {
        this._detach();
        if (this.target) {
            this.target.off('loaded', this._onTargetLoaded);
            this.target.off('unloaded', this._onTargetUnloaded);
            this._onTargetLoaded = null;
            this._onTargetUnloaded = null;
        }
        // clears target, context and callback references
        super.disconnect();
    }
    _detach() {
        this._notifyTouch = false;
        this._simpleGestureDetector = null;
        this._scaleGestureDetector = null;
        this._swipeGestureDetector = null;
        this._panGestureDetector = null;
        this._rotateGestureDetector = null;
        this._eventData = null;
    }
    _attach(target, type) {
        this._detach();
        let recognizer;
        if (type & GestureTypes.tap || type & GestureTypes.doubleTap || type & GestureTypes.longPress) {
            initializeTapAndDoubleTapGestureListener();
            recognizer = this._simpleGestureDetector = new androidx.core.view.GestureDetectorCompat(target._context, new TapAndDoubleTapGestureListener(this, this.target, type));
        }
        if (type & GestureTypes.pinch) {
            initializePinchGestureListener();
            recognizer = this._scaleGestureDetector = new android.view.ScaleGestureDetector(target._context, new PinchGestureListener(this, this.target));
        }
        if (type & GestureTypes.swipe) {
            initializeSwipeGestureListener();
            recognizer = this._swipeGestureDetector = new androidx.core.view.GestureDetectorCompat(target._context, new SwipeGestureListener(this, this.target));
        }
        if (type & GestureTypes.pan) {
            recognizer = this._panGestureDetector = new CustomPanGestureDetector(this, this.target);
        }
        if (type & GestureTypes.rotation) {
            recognizer = this._rotateGestureDetector = new CustomRotateGestureDetector(this, this.target);
        }
        if (type & GestureTypes.touch) {
            this._notifyTouch = true;
        }
        else {
            this.target.notify({
                eventName: GestureEvents.gestureAttached,
                object: this.target,
                type,
                view: this.target,
                ios: recognizer,
            });
        }
    }
    androidOnTouchEvent(motionEvent) {
        if (this._notifyTouch) {
            if (!this._eventData) {
                this._eventData = new TouchGestureEventData();
            }
            this._eventData.prepare(this.target, motionEvent);
            _executeCallback(this, this._eventData);
        }
        if (this._simpleGestureDetector) {
            this._simpleGestureDetector.onTouchEvent(motionEvent);
        }
        if (this._scaleGestureDetector) {
            this._scaleGestureDetector.onTouchEvent(motionEvent);
        }
        if (this._swipeGestureDetector) {
            this._swipeGestureDetector.onTouchEvent(motionEvent);
        }
        if (this._panGestureDetector) {
            this._panGestureDetector.onTouchEvent(motionEvent);
        }
        if (this._rotateGestureDetector) {
            this._rotateGestureDetector.onTouchEvent(motionEvent);
        }
    }
}
function _getTapArgs(type, view, e) {
    return {
        type: type,
        view: view,
        android: e,
        ios: undefined,
        object: view,
        eventName: toString(type),
        getPointerCount: () => e.getPointerCount(),
        getX: () => layout.toDeviceIndependentPixels(e.getX()),
        getY: () => layout.toDeviceIndependentPixels(e.getY()),
    };
}
function _getLongPressArgs(type, view, state, e) {
    return {
        type: type,
        view: view,
        android: e,
        ios: undefined,
        object: view,
        eventName: toString(type),
        state: state,
    };
}
function _getSwipeArgs(direction, view, initialEvent, currentEvent) {
    return {
        type: GestureTypes.swipe,
        view: view,
        android: { initial: initialEvent, current: currentEvent },
        direction: direction,
        ios: undefined,
        object: view,
        eventName: toString(GestureTypes.swipe),
    };
}
function _getPanArgs(deltaX, deltaY, view, state, initialEvent, currentEvent) {
    return {
        type: GestureTypes.pan,
        view: view,
        android: { initial: initialEvent, current: currentEvent },
        deltaX: deltaX,
        deltaY: deltaY,
        ios: undefined,
        object: view,
        eventName: toString(GestureTypes.pan),
        state: state,
    };
}
function _executeCallback(observer, args) {
    if (observer && observer.callback) {
        observer.callback.call(observer._context, args);
    }
}
class PinchGestureEventData {
    constructor(view, android, scale, object, state) {
        this.view = view;
        this.android = android;
        this.scale = scale;
        this.object = object;
        this.state = state;
        this.type = GestureTypes.pinch;
        this.eventName = toString(GestureTypes.pinch);
    }
    getFocusX() {
        return this.android.getFocusX() / layout.getDisplayDensity();
    }
    getFocusY() {
        return this.android.getFocusY() / layout.getDisplayDensity();
    }
}
class CustomPanGestureDetector {
    constructor(observer, target) {
        this.observer = observer;
        this.target = target;
        this.isTracking = false;
        this.density = layout.getDisplayDensity();
    }
    onTouchEvent(event) {
        switch (event.getActionMasked()) {
            case android.view.MotionEvent.ACTION_UP:
            case android.view.MotionEvent.ACTION_CANCEL:
                this.trackStop(event, false);
                break;
            case android.view.MotionEvent.ACTION_DOWN:
            case android.view.MotionEvent.ACTION_POINTER_DOWN:
            case android.view.MotionEvent.ACTION_POINTER_UP:
                this.trackStop(event, true);
                break;
            case android.view.MotionEvent.ACTION_MOVE:
                if (!this.isTracking) {
                    this.trackStart(event);
                }
                this.trackChange(event);
                break;
        }
        return true;
    }
    trackStop(currentEvent, cacheEvent) {
        if (this.isTracking) {
            const args = _getPanArgs(this.deltaX, this.deltaY, this.target, GestureStateTypes.ended, null, currentEvent);
            _executeCallback(this.observer, args);
            this.deltaX = undefined;
            this.deltaY = undefined;
            this.isTracking = false;
        }
        if (cacheEvent) {
            this.lastEventCache = currentEvent;
        }
        else {
            this.lastEventCache = undefined;
        }
    }
    trackStart(currentEvent) {
        const inital = this.getEventCoordinates(this.lastEventCache ? this.lastEventCache : currentEvent);
        this.initialX = inital.x;
        this.initialY = inital.y;
        this.isTracking = true;
        const args = _getPanArgs(0, 0, this.target, GestureStateTypes.began, null, currentEvent);
        _executeCallback(this.observer, args);
    }
    trackChange(currentEvent) {
        const current = this.getEventCoordinates(currentEvent);
        this.deltaX = current.x - this.initialX;
        this.deltaY = current.y - this.initialY;
        const args = _getPanArgs(this.deltaX, this.deltaY, this.target, GestureStateTypes.changed, null, currentEvent);
        _executeCallback(this.observer, args);
    }
    getEventCoordinates(event) {
        const count = event.getPointerCount();
        if (count === 1) {
            return {
                x: event.getRawX() / this.density,
                y: event.getRawY() / this.density,
            };
        }
        else {
            const offX = event.getRawX() - event.getX();
            const offY = event.getRawY() - event.getY();
            const res = { x: 0, y: 0 };
            for (let i = 0; i < count; i++) {
                res.x += event.getX(i) + offX;
                res.y += event.getY(i) + offY;
            }
            res.x /= count * this.density;
            res.y /= count * this.density;
            return res;
        }
    }
}
class CustomRotateGestureDetector {
    constructor(observer, target) {
        this.observer = observer;
        this.target = target;
        this.trackedPtrId1 = INVALID_POINTER_ID;
        this.trackedPtrId2 = INVALID_POINTER_ID;
    }
    get isTracking() {
        return this.trackedPtrId1 !== INVALID_POINTER_ID && this.trackedPtrId2 !== INVALID_POINTER_ID;
    }
    onTouchEvent(event) {
        const pointerID = event.getPointerId(event.getActionIndex());
        const wasTracking = this.isTracking;
        switch (event.getActionMasked()) {
            case android.view.MotionEvent.ACTION_DOWN:
            case android.view.MotionEvent.ACTION_POINTER_DOWN: {
                let assigned = false;
                if (this.trackedPtrId1 === INVALID_POINTER_ID && pointerID !== this.trackedPtrId2) {
                    this.trackedPtrId1 = pointerID;
                    assigned = true;
                }
                else if (this.trackedPtrId2 === INVALID_POINTER_ID && pointerID !== this.trackedPtrId1) {
                    this.trackedPtrId2 = pointerID;
                    assigned = true;
                }
                if (assigned && this.isTracking) {
                    // We have started tracking 2 pointers
                    this.angle = 0;
                    this.initalPointersAngle = this.getPointersAngle(event);
                    this.executeCallback(event, GestureStateTypes.began);
                }
                break;
            }
            case android.view.MotionEvent.ACTION_MOVE:
                if (this.isTracking) {
                    this.updateAngle(event);
                    this.executeCallback(event, GestureStateTypes.changed);
                }
                break;
            case android.view.MotionEvent.ACTION_UP:
            case android.view.MotionEvent.ACTION_POINTER_UP:
                if (pointerID === this.trackedPtrId1) {
                    this.trackedPtrId1 = INVALID_POINTER_ID;
                }
                else if (pointerID === this.trackedPtrId2) {
                    this.trackedPtrId2 = INVALID_POINTER_ID;
                }
                if (wasTracking && !this.isTracking) {
                    this.executeCallback(event, GestureStateTypes.ended);
                }
                break;
            case android.view.MotionEvent.ACTION_CANCEL:
                this.trackedPtrId1 = INVALID_POINTER_ID;
                this.trackedPtrId2 = INVALID_POINTER_ID;
                if (wasTracking) {
                    this.executeCallback(event, GestureStateTypes.cancelled);
                }
                break;
        }
        return true;
    }
    executeCallback(event, state) {
        const args = {
            type: GestureTypes.rotation,
            view: this.target,
            android: event,
            rotation: this.angle,
            ios: undefined,
            object: this.target,
            eventName: toString(GestureTypes.rotation),
            state: state,
        };
        _executeCallback(this.observer, args);
    }
    updateAngle(event) {
        const newPointersAngle = this.getPointersAngle(event);
        let result = ((newPointersAngle - this.initalPointersAngle) * TO_DEGREES) % 360;
        if (result < -180) {
            result += 360;
        }
        if (result > 180) {
            result -= 360;
        }
        this.angle = result;
    }
    getPointersAngle(event) {
        const firstX = event.getX(event.findPointerIndex(this.trackedPtrId1));
        const firstY = event.getY(event.findPointerIndex(this.trackedPtrId1));
        const secondX = event.getX(event.findPointerIndex(this.trackedPtrId2));
        const secondY = event.getY(event.findPointerIndex(this.trackedPtrId2));
        return Math.atan2(secondY - firstY, secondX - firstX);
    }
}
class Pointer {
    constructor(id, event) {
        this.event = event;
        this.ios = undefined;
        this.android = id;
    }
    getX() {
        return this.event.getX(this.android) / layout.getDisplayDensity();
    }
    getY() {
        return this.event.getY(this.android) / layout.getDisplayDensity();
    }
}
class TouchGestureEventData {
    constructor() {
        this.eventName = toString(GestureTypes.touch);
        this.type = GestureTypes.touch;
        this.ios = undefined;
    }
    prepare(view, e) {
        this.view = view;
        this.object = view;
        this.android = e;
        this.action = this.getActionType(e);
        this._activePointers = undefined;
        this._allPointers = undefined;
    }
    getPointerCount() {
        return this.android.getPointerCount();
    }
    getActivePointers() {
        // Only one active pointer in Android
        if (!this._activePointers) {
            this._activePointers = [new Pointer(this.android.getActionIndex(), this.android)];
        }
        return this._activePointers;
    }
    getAllPointers() {
        if (!this._allPointers) {
            this._allPointers = [];
            for (let i = 0; i < this.getPointerCount(); i++) {
                this._allPointers.push(new Pointer(i, this.android));
            }
        }
        return this._allPointers;
    }
    getX() {
        return this.getActivePointers()[0].getX();
    }
    getY() {
        return this.getActivePointers()[0].getY();
    }
    getActionType(e) {
        switch (e.getActionMasked()) {
            case android.view.MotionEvent.ACTION_DOWN:
            case android.view.MotionEvent.ACTION_POINTER_DOWN:
                return TouchAction.down;
            case android.view.MotionEvent.ACTION_MOVE:
                return TouchAction.move;
            case android.view.MotionEvent.ACTION_UP:
            case android.view.MotionEvent.ACTION_POINTER_UP:
                return TouchAction.up;
            case android.view.MotionEvent.ACTION_CANCEL:
                return TouchAction.cancel;
        }
        return '';
    }
}
//# sourceMappingURL=index.android.js.map