import { Animation } from '../animation';
import { View } from '../core/view';
import { isObject, isFunction } from '../../utils/types';
import { GestureEvents, GestureStateTypes, GestureTypes } from './gestures-common';
export var TouchAnimationTypes;
(function (TouchAnimationTypes) {
    TouchAnimationTypes["up"] = "up";
    TouchAnimationTypes["down"] = "down";
})(TouchAnimationTypes || (TouchAnimationTypes = {}));
/**
 * Manage interactivity in your apps easily with TouchManager.
 * Store reusable down/up animation settings for touches as well as optionally enable automatic tap (down/up) animations for your app.
 */
export class TouchManager {
    /**
     * The TouchManager uses this internally.
     * Adds touch animations to view based upon it's touchAnimation property or TouchManager.animations.
     * @param view NativeScript view instance
     */
    static addAnimations(view) {
        var _a;
        const handleDown = ((view === null || view === void 0 ? void 0 : view.touchAnimation) && (view === null || view === void 0 ? void 0 : view.touchAnimation).down) || (TouchManager.animations && TouchManager.animations.down);
        const handleUp = ((view === null || view === void 0 ? void 0 : view.touchAnimation) && (view === null || view === void 0 ? void 0 : view.touchAnimation).up) || (TouchManager.animations && TouchManager.animations.up);
        if (global.isIOS) {
            if ((_a = view === null || view === void 0 ? void 0 : view.ios) === null || _a === void 0 ? void 0 : _a.addTargetActionForControlEvents) {
                // can use UIControlEvents
                if (!TouchManager.touchHandlers) {
                    TouchManager.touchHandlers = [];
                }
                TouchManager.touchHandlers.push({
                    view,
                    handler: TouchControlHandler.initWithOwner(new WeakRef(view)),
                });
                if (handleDown) {
                    view.ios.addTargetActionForControlEvents(TouchManager.touchHandlers[TouchManager.touchHandlers.length - 1].handler, GestureEvents.touchDown, 1 /* TouchDown */ | 16 /* TouchDragEnter */);
                    view.on(GestureEvents.touchDown, (args) => {
                        TouchManager.startAnimationForType(view, TouchAnimationTypes.down);
                    });
                }
                if (handleUp) {
                    view.ios.addTargetActionForControlEvents(TouchManager.touchHandlers[TouchManager.touchHandlers.length - 1].handler, GestureEvents.touchUp, 32 /* TouchDragExit */ | 256 /* TouchCancel */ | 64 /* TouchUpInside */ | 128 /* TouchUpOutside */);
                    view.on(GestureEvents.touchUp, (args) => {
                        TouchManager.startAnimationForType(view, TouchAnimationTypes.up);
                    });
                }
            }
            else {
                if (handleDown || handleUp) {
                    view.on(GestureEvents.gestureAttached, (args) => {
                        if (args.type === GestureTypes.longPress) {
                            args.ios.minimumPressDuration = 0;
                        }
                    });
                    view.on(GestureTypes.longPress, (args) => {
                        switch (args.state) {
                            case GestureStateTypes.began:
                                if (handleDown) {
                                    TouchManager.startAnimationForType(args.view, TouchAnimationTypes.down);
                                }
                                break;
                            case GestureStateTypes.cancelled:
                            case GestureStateTypes.ended:
                                if (handleUp) {
                                    TouchManager.startAnimationForType(args.view, TouchAnimationTypes.up);
                                }
                                break;
                        }
                    });
                }
            }
        }
        else {
            if (handleDown || handleUp) {
                view.on(GestureTypes.touch, (args) => {
                    switch (args.action) {
                        case 'down':
                            if (handleDown) {
                                view.notify({
                                    eventName: GestureEvents.touchDown,
                                    object: view,
                                    data: args.android,
                                });
                            }
                            break;
                        case 'up':
                        case 'cancel':
                            if (handleUp) {
                                view.notify({
                                    eventName: GestureEvents.touchUp,
                                    object: view,
                                    data: args.android,
                                });
                            }
                            break;
                    }
                });
                if (handleDown) {
                    view.on(GestureEvents.touchDown, (args) => {
                        TouchManager.startAnimationForType(view, TouchAnimationTypes.down);
                    });
                }
                if (handleUp) {
                    view.on(GestureEvents.touchUp, (args) => {
                        TouchManager.startAnimationForType(view, TouchAnimationTypes.up);
                    });
                }
            }
        }
        view.on(View.disposeNativeViewEvent, (args) => {
            var _a, _b;
            const index = (_a = TouchManager.touchHandlers) === null || _a === void 0 ? void 0 : _a.findIndex((handler) => handler.view === args.object);
            if (index > -1) {
                TouchManager.touchHandlers.splice(index, 1);
            }
            TouchManager.touchAnimationDefinitions = (_b = TouchManager.touchAnimationDefinitions) === null || _b === void 0 ? void 0 : _b.filter((d) => d.view !== args.object);
        });
    }
    static startAnimationForType(view, type) {
        var _a, _b;
        if (view) {
            const animate = function (definition) {
                if (definition) {
                    if (isFunction(definition)) {
                        definition(view);
                    }
                    else {
                        if (!TouchManager.touchAnimationDefinitions) {
                            TouchManager.touchAnimationDefinitions = [];
                        }
                        // reuse animations for each type
                        let touchAnimation;
                        // triggering animations should always cancel other animations which may be in progress
                        for (const d of TouchManager.touchAnimationDefinitions) {
                            if (d.view === view && d.animation) {
                                d.animation.cancel();
                                if (d.type === type) {
                                    touchAnimation = d.animation;
                                }
                            }
                        }
                        if (!touchAnimation) {
                            touchAnimation = new Animation([
                                Object.assign({ target: view }, definition),
                            ]);
                            TouchManager.touchAnimationDefinitions.push({
                                view,
                                type,
                                animation: touchAnimation,
                            });
                        }
                        touchAnimation.play().catch(() => { });
                    }
                }
            };
            // always use instance defined animation over global
            if (isObject(view.touchAnimation) && view.touchAnimation[type]) {
                animate(view.touchAnimation[type]);
            }
            else if ((_a = TouchManager.animations) === null || _a === void 0 ? void 0 : _a[type]) {
                // fallback to globally defined
                animate((_b = TouchManager.animations) === null || _b === void 0 ? void 0 : _b[type]);
            }
        }
    }
}
export let TouchControlHandler;
ensureTouchControlHandlers();
function ensureTouchControlHandlers() {
    if (global.isIOS) {
        var TouchHandlerImpl = /** @class */ (function (_super) {
    __extends(TouchHandlerImpl, _super);
    function TouchHandlerImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    TouchHandlerImpl.initWithOwner = function (owner) {
        var handler = TouchHandlerImpl.new();
        handler._owner = owner;
        return handler;
    };
    TouchHandlerImpl.prototype.touchDown = function (args) {
        var _a, _b, _c, _d;
        (_b = (_a = this._owner) === null || _a === void 0 ? void 0 : _a.get) === null || _b === void 0 ? void 0 : _b.call(_a).notify({
            eventName: GestureEvents.touchDown,
            object: (_d = (_c = this._owner) === null || _c === void 0 ? void 0 : _c.get) === null || _d === void 0 ? void 0 : _d.call(_c),
            data: args,
        });
    };
    TouchHandlerImpl.prototype.touchUp = function (args) {
        var _a, _b, _c, _d;
        (_b = (_a = this._owner) === null || _a === void 0 ? void 0 : _a.get) === null || _b === void 0 ? void 0 : _b.call(_a).notify({
            eventName: GestureEvents.touchUp,
            object: (_d = (_c = this._owner) === null || _c === void 0 ? void 0 : _c.get) === null || _d === void 0 ? void 0 : _d.call(_c),
            data: args,
        });
    };
    TouchHandlerImpl.ObjCExposedMethods = {
        touchDown: { returns: interop.types.void, params: [interop.types.id] },
        touchUp: { returns: interop.types.void, params: [interop.types.id] },
    };
    return TouchHandlerImpl;
}(NSObject));
        TouchControlHandler = TouchHandlerImpl;
    }
}
//# sourceMappingURL=touch-manager.js.map