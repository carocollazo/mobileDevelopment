// Definitions.
// Types.
import { GesturesObserverBase, toString, TouchAction, GestureStateTypes, GestureTypes, SwipeDirection, GestureEvents } from './gestures-common';
// Import layout from utils directly to avoid circular references
import { layout } from '../../utils';
export * from './gestures-common';
export function observe(target, type, callback, context) {
    const observer = new GesturesObserver(target, callback, context);
    observer.observe(type);
    return observer;
}
var UIGestureRecognizerDelegateImpl = /** @class */ (function (_super) {
    __extends(UIGestureRecognizerDelegateImpl, _super);
    function UIGestureRecognizerDelegateImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    UIGestureRecognizerDelegateImpl.prototype.gestureRecognizerShouldRecognizeSimultaneouslyWithGestureRecognizer = function (gestureRecognizer, otherGestureRecognizer) {
        return true;
    };
    UIGestureRecognizerDelegateImpl.prototype.gestureRecognizerShouldRequireFailureOfGestureRecognizer = function (gestureRecognizer, otherGestureRecognizer) {
        // If both gesture recognizers are of type UITapGestureRecognizer & one of them is a doubleTap,
        // we must require a failure.
        if (gestureRecognizer instanceof UITapGestureRecognizer && otherGestureRecognizer instanceof UITapGestureRecognizer && otherGestureRecognizer.numberOfTapsRequired === 2) {
            return true;
        }
        return false;
    };
    UIGestureRecognizerDelegateImpl.ObjCProtocols = [UIGestureRecognizerDelegate];
    return UIGestureRecognizerDelegateImpl;
}(NSObject));
const recognizerDelegateInstance = UIGestureRecognizerDelegateImpl.new();
var UIGestureRecognizerImpl = /** @class */ (function (_super) {
    __extends(UIGestureRecognizerImpl, _super);
    function UIGestureRecognizerImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    UIGestureRecognizerImpl.initWithOwnerTypeCallback = function (owner, type, callback, thisArg) {
        var handler = UIGestureRecognizerImpl.new();
        handler._owner = owner;
        handler._type = type;
        if (callback) {
            handler._callback = callback;
        }
        if (thisArg) {
            handler._context = thisArg;
        }
        return handler;
    };
    UIGestureRecognizerImpl.prototype.recognize = function (recognizer) {
        var owner = this._owner.get();
        var callback = this._callback ? this._callback : owner ? owner.callback : null;
        var typeParam = this._type;
        var target = owner ? owner.target : undefined;
        var args = {
            type: typeParam,
            view: target,
            ios: recognizer,
            android: undefined,
            object: target,
            eventName: toString(typeParam),
        };
        if (callback) {
            callback.call(this._context, args);
        }
    };
    UIGestureRecognizerImpl.ObjCExposedMethods = {
        recognize: {
            returns: interop.types.void,
            params: [UIGestureRecognizer],
        },
    };
    return UIGestureRecognizerImpl;
}(NSObject));
export class GesturesObserver extends GesturesObserverBase {
    constructor(target, callback, context) {
        super(target, callback, context);
        this._recognizers = {};
    }
    androidOnTouchEvent(motionEvent) {
        //
    }
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
    _attach(target, type) {
        this._detach();
        if (target && target.nativeViewProtected && target.nativeViewProtected.addGestureRecognizer) {
            const nativeView = target.nativeViewProtected;
            if (type & GestureTypes.tap) {
                nativeView.addGestureRecognizer(this._createRecognizer(GestureTypes.tap, (args) => {
                    if (args.view) {
                        this._executeCallback(_getTapData(args));
                    }
                }));
            }
            if (type & GestureTypes.doubleTap) {
                nativeView.addGestureRecognizer(this._createRecognizer(GestureTypes.doubleTap, (args) => {
                    if (args.view) {
                        this._executeCallback(_getTapData(args));
                    }
                }));
            }
            if (type & GestureTypes.pinch) {
                nativeView.addGestureRecognizer(this._createRecognizer(GestureTypes.pinch, (args) => {
                    if (args.view) {
                        this._executeCallback(_getPinchData(args));
                    }
                }));
            }
            if (type & GestureTypes.pan) {
                nativeView.addGestureRecognizer(this._createRecognizer(GestureTypes.pan, (args) => {
                    if (args.view) {
                        this._executeCallback(_getPanData(args, target.nativeViewProtected));
                    }
                }));
            }
            if (type & GestureTypes.swipe) {
                nativeView.addGestureRecognizer(this._createRecognizer(GestureTypes.swipe, (args) => {
                    if (args.view) {
                        this._executeCallback(_getSwipeData(args));
                    }
                }, 8 /* Down */));
                nativeView.addGestureRecognizer(this._createRecognizer(GestureTypes.swipe, (args) => {
                    if (args.view) {
                        this._executeCallback(_getSwipeData(args));
                    }
                }, 2 /* Left */));
                nativeView.addGestureRecognizer(this._createRecognizer(GestureTypes.swipe, (args) => {
                    if (args.view) {
                        this._executeCallback(_getSwipeData(args));
                    }
                }, 1 /* Right */));
                nativeView.addGestureRecognizer(this._createRecognizer(GestureTypes.swipe, (args) => {
                    if (args.view) {
                        this._executeCallback(_getSwipeData(args));
                    }
                }, 4 /* Up */));
            }
            if (type & GestureTypes.rotation) {
                nativeView.addGestureRecognizer(this._createRecognizer(GestureTypes.rotation, (args) => {
                    if (args.view) {
                        this._executeCallback(_getRotationData(args));
                    }
                }));
            }
            if (type & GestureTypes.longPress) {
                nativeView.addGestureRecognizer(this._createRecognizer(GestureTypes.longPress, (args) => {
                    if (args.view) {
                        this._executeCallback(_getLongPressData(args));
                    }
                }));
            }
            if (type & GestureTypes.touch) {
                nativeView.addGestureRecognizer(this._createRecognizer(GestureTypes.touch));
            }
        }
    }
    _detach() {
        if (this.target && this.target.nativeViewProtected) {
            for (const name in this._recognizers) {
                if (this._recognizers.hasOwnProperty(name)) {
                    const item = this._recognizers[name];
                    this.target.nativeViewProtected.removeGestureRecognizer(item.recognizer);
                    item.recognizer = null;
                    item.target = null;
                }
            }
            this._recognizers = {};
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
    _executeCallback(args) {
        if (this.callback) {
            this.callback.call(this.context, args);
        }
    }
    _createRecognizer(type, callback, swipeDirection) {
        let recognizer;
        let name = toString(type);
        const target = _createUIGestureRecognizerTarget(this, type, callback, this.context);
        const recognizerType = _getUIGestureRecognizerType(type);
        if (recognizerType) {
            recognizer = recognizerType.alloc().initWithTargetAction(target, 'recognize');
            if (type === GestureTypes.swipe && swipeDirection) {
                name = name + swipeDirection.toString();
                recognizer.direction = swipeDirection;
            }
            else if (type === GestureTypes.touch) {
                recognizer.observer = this;
            }
            else if (type === GestureTypes.doubleTap) {
                recognizer.numberOfTapsRequired = 2;
            }
            if (recognizer) {
                recognizer.delegate = recognizerDelegateInstance;
                this._recognizers[name] = {
                    recognizer: recognizer,
                    target: target,
                };
            }
            this.target.notify({
                eventName: GestureEvents.gestureAttached,
                object: this.target,
                type,
                view: this.target,
                ios: recognizer,
            });
        }
        return recognizer;
    }
}
function _createUIGestureRecognizerTarget(owner, type, callback, context) {
    return UIGestureRecognizerImpl.initWithOwnerTypeCallback(new WeakRef(owner), type, callback, context);
}
function _getUIGestureRecognizerType(type) {
    let nativeType = null;
    if (type === GestureTypes.tap) {
        nativeType = UITapGestureRecognizer;
    }
    else if (type === GestureTypes.doubleTap) {
        nativeType = UITapGestureRecognizer;
    }
    else if (type === GestureTypes.pinch) {
        nativeType = UIPinchGestureRecognizer;
    }
    else if (type === GestureTypes.pan) {
        nativeType = UIPanGestureRecognizer;
    }
    else if (type === GestureTypes.swipe) {
        nativeType = UISwipeGestureRecognizer;
    }
    else if (type === GestureTypes.rotation) {
        nativeType = UIRotationGestureRecognizer;
    }
    else if (type === GestureTypes.longPress) {
        nativeType = UILongPressGestureRecognizer;
    }
    else if (type === GestureTypes.touch) {
        nativeType = TouchGestureRecognizer;
    }
    return nativeType;
}
function getState(recognizer) {
    if (recognizer.state === 1 /* Began */) {
        return GestureStateTypes.began;
    }
    else if (recognizer.state === 4 /* Cancelled */ || recognizer.state === 5 /* Failed */) {
        return GestureStateTypes.cancelled;
    }
    else if (recognizer.state === 2 /* Changed */) {
        return GestureStateTypes.changed;
    }
    else if (recognizer.state === 3 /* Ended */) {
        return GestureStateTypes.ended;
    }
}
function _getSwipeDirection(direction) {
    if (direction === 8 /* Down */) {
        return SwipeDirection.down;
    }
    else if (direction === 2 /* Left */) {
        return SwipeDirection.left;
    }
    else if (direction === 1 /* Right */) {
        return SwipeDirection.right;
    }
    else if (direction === 4 /* Up */) {
        return SwipeDirection.up;
    }
}
function _getTapData(args) {
    const recognizer = args.ios;
    const center = recognizer.locationInView(args.view.nativeViewProtected);
    return {
        type: args.type,
        view: args.view,
        ios: args.ios,
        android: undefined,
        eventName: args.eventName,
        object: args.object,
        getPointerCount: () => recognizer.numberOfTouches,
        getX: () => layout.toDeviceIndependentPixels(center.x),
        getY: () => layout.toDeviceIndependentPixels(center.y),
    };
}
function _getPinchData(args) {
    const recognizer = args.ios;
    const center = recognizer.locationInView(args.view.nativeViewProtected);
    return {
        type: args.type,
        view: args.view,
        ios: args.ios,
        android: undefined,
        scale: recognizer.scale,
        getFocusX: () => center.x,
        getFocusY: () => center.y,
        object: args.view,
        eventName: toString(args.type),
        state: getState(recognizer),
    };
}
function _getSwipeData(args) {
    const recognizer = args.ios;
    return {
        type: args.type,
        view: args.view,
        ios: args.ios,
        android: undefined,
        direction: _getSwipeDirection(recognizer.direction),
        object: args.view,
        eventName: toString(args.type),
    };
}
function _getPanData(args, view) {
    const recognizer = args.ios;
    return {
        type: args.type,
        view: args.view,
        ios: args.ios,
        android: undefined,
        deltaX: recognizer.translationInView(view).x,
        deltaY: recognizer.translationInView(view).y,
        object: args.view,
        eventName: toString(args.type),
        state: getState(recognizer),
    };
}
function _getRotationData(args) {
    const recognizer = args.ios;
    return {
        type: args.type,
        view: args.view,
        ios: args.ios,
        android: undefined,
        rotation: recognizer.rotation * (180.0 / Math.PI),
        object: args.view,
        eventName: toString(args.type),
        state: getState(recognizer),
    };
}
function _getLongPressData(args) {
    const recognizer = args.ios;
    return {
        type: args.type,
        view: args.view,
        ios: args.ios,
        android: undefined,
        object: args.view,
        eventName: toString(args.type),
        state: getState(recognizer),
    };
}
var TouchGestureRecognizer = /** @class */ (function (_super) {
    __extends(TouchGestureRecognizer, _super);
    function TouchGestureRecognizer() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TouchGestureRecognizer.prototype.touchesBeganWithEvent = function (touches, event) {
        this.executeCallback(TouchAction.down, touches, event);
        if (this.view) {
            this.view.touchesBeganWithEvent(touches, event);
        }
    };
    TouchGestureRecognizer.prototype.touchesMovedWithEvent = function (touches, event) {
        this.executeCallback(TouchAction.move, touches, event);
        if (this.view) {
            this.view.touchesMovedWithEvent(touches, event);
        }
    };
    TouchGestureRecognizer.prototype.touchesEndedWithEvent = function (touches, event) {
        this.executeCallback(TouchAction.up, touches, event);
        if (this.view) {
            this.view.touchesEndedWithEvent(touches, event);
        }
    };
    TouchGestureRecognizer.prototype.touchesCancelledWithEvent = function (touches, event) {
        this.executeCallback(TouchAction.cancel, touches, event);
        if (this.view) {
            this.view.touchesCancelledWithEvent(touches, event);
        }
    };
    TouchGestureRecognizer.prototype.executeCallback = function (action, touches, event) {
        if (!this._eventData) {
            this._eventData = new TouchGestureEventData();
        }
        this._eventData.prepare(this.observer.target, action, touches, event);
        this.observer._executeCallback(this._eventData);
    };
    return TouchGestureRecognizer;
}(UIGestureRecognizer));
class Pointer {
    constructor(touch, targetView) {
        this.android = undefined;
        this.ios = undefined;
        this.ios = touch;
        this._view = targetView;
    }
    get location() {
        if (!this._location) {
            this._location = this.ios.locationInView(this._view.nativeViewProtected);
        }
        return this._location;
    }
    getX() {
        return this.location.x;
    }
    getY() {
        return this.location.y;
    }
}
class TouchGestureEventData {
    constructor() {
        this.eventName = toString(GestureTypes.touch);
        this.type = GestureTypes.touch;
        this.android = undefined;
    }
    prepare(view, action, touches, event) {
        this.action = action;
        this.view = view;
        this.object = view;
        this.ios = {
            touches: touches,
            event: event,
        };
        this._mainPointer = undefined;
        this._activePointers = undefined;
        this._allPointers = undefined;
    }
    getPointerCount() {
        return this.ios.event.allTouches.count;
    }
    getMainPointer() {
        if (this._mainPointer === undefined) {
            this._mainPointer = this.ios.touches.anyObject();
        }
        return this._mainPointer;
    }
    getActivePointers() {
        if (!this._activePointers) {
            this._activePointers = [];
            for (let i = 0, nsArr = this.ios.touches.allObjects; i < nsArr.count; i++) {
                this._activePointers.push(new Pointer(nsArr.objectAtIndex(i), this.view));
            }
        }
        return this._activePointers;
    }
    getAllPointers() {
        if (!this._allPointers) {
            this._allPointers = [];
            const nsArr = this.ios.event.allTouches.allObjects;
            for (let i = 0; i < nsArr.count; i++) {
                this._allPointers.push(new Pointer(nsArr.objectAtIndex(i), this.view));
            }
        }
        return this._allPointers;
    }
    getX() {
        const offset = this.view.nativeViewProtected.contentOffset;
        const offsetX = offset ? offset.x : 0;
        return this.getMainPointer().locationInView(this.view.nativeViewProtected).x - offsetX;
    }
    getY() {
        const offset = this.view.nativeViewProtected.contentOffset;
        const offsetY = offset ? offset.y : 0;
        return this.getMainPointer().locationInView(this.view.nativeViewProtected).y - offsetY;
    }
}
//# sourceMappingURL=index.ios.js.map