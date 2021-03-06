import { CoreTypes } from '../../../core-types';
import { Trace } from '../../../trace';
import { CSSType } from '../../core/view';
import { GridLayout } from '../grid-layout';
import { Animation } from '../../animation';
let RootLayoutBase = class RootLayoutBase extends GridLayout {
    constructor() {
        super();
        this.popupViews = [];
        global.rootLayout = this;
        this.on('loaded', () => {
            // get actual content count of rootLayout (elements between the <RootLayout> tags in the template).
            // All popups will be inserted dynamically at a higher index
            this.staticChildCount = this.getChildrenCount();
        });
    }
    // ability to add any view instance to compositie views like layers
    open(view, options) {
        return new Promise((resolve, reject) => {
            try {
                if (this.hasChild(view)) {
                    if (Trace.isEnabled()) {
                        Trace.write(`${view} has already been added`, Trace.categories.Layout);
                    }
                }
                else {
                    // keep track of the views locally to be able to use their options later
                    this.popupViews.push({ view: view, options: options });
                    if (options === null || options === void 0 ? void 0 : options.shadeCover) {
                        // perf optimization note: we only need 1 layer of shade cover
                        // we just update properties if needed by additional overlaid views
                        if (this.shadeCover) {
                            // overwrite current shadeCover options if topmost popupview has additional shadeCover configurations
                            this.updateShadeCover(this.shadeCover, options.shadeCover);
                        }
                        else {
                            this.openShadeCover(options.shadeCover);
                        }
                    }
                    view.opacity = 0; // always begin with view invisible when adding dynamically
                    this.insertChild(view, this.getChildrenCount() + 1);
                    setTimeout(() => {
                        // only apply initial state and animate after the first tick - ensures safe areas and other measurements apply correctly
                        this.applyInitialState(view, options.animation ? options.animation.enterFrom : null);
                        this.getEnterAnimation(view, options.animation ? options.animation.enterFrom : null)
                            .play()
                            .then(() => {
                            this.applyDefaultState(view);
                            resolve();
                        })
                            .catch((ex) => {
                            if (Trace.isEnabled()) {
                                Trace.write(`Error playing enter animation: ${ex}`, Trace.categories.Layout, Trace.messageType.error);
                            }
                        });
                    });
                }
            }
            catch (ex) {
                if (Trace.isEnabled()) {
                    Trace.write(`Error opening popup (${view}): ${ex}`, Trace.categories.Layout, Trace.messageType.error);
                }
            }
        });
    }
    // optional animation parameter to overwrite close animation declared when opening popup
    // ability to remove any view instance from composite views
    close(view, exitTo) {
        return new Promise((resolve, reject) => {
            var _a, _b, _c, _d, _e;
            if (this.hasChild(view)) {
                const cleanupAndFinish = () => {
                    this.removeChild(view);
                    resolve();
                };
                try {
                    const popupIndex = this.getPopupIndex(view);
                    const poppedView = this.popupViews[popupIndex];
                    // use exitAnimation that is passed in and fallback to the exitAnimation passed in when opening
                    const exitAnimationDefinition = exitTo || ((_b = (_a = poppedView === null || poppedView === void 0 ? void 0 : poppedView.options) === null || _a === void 0 ? void 0 : _a.animation) === null || _b === void 0 ? void 0 : _b.exitTo);
                    // Remove view from tracked popupviews
                    this.popupViews.splice(popupIndex, 1);
                    if (this.shadeCover) {
                        // update shade cover with the topmost popupView options (if not specifically told to ignore)
                        if (!((_c = poppedView === null || poppedView === void 0 ? void 0 : poppedView.options) === null || _c === void 0 ? void 0 : _c.shadeCover.ignoreShadeRestore)) {
                            const shadeCoverOptions = (_e = (_d = this.popupViews[this.popupViews.length - 1]) === null || _d === void 0 ? void 0 : _d.options) === null || _e === void 0 ? void 0 : _e.shadeCover;
                            if (shadeCoverOptions) {
                                this.updateShadeCover(this.shadeCover, shadeCoverOptions);
                            }
                        }
                        // remove shade cover animation if this is the last opened popup view
                        if (this.popupViews.length === 0) {
                            this.closeShadeCover(poppedView.options.shadeCover);
                        }
                    }
                    if (exitAnimationDefinition) {
                        this.getExitAnimation(view, exitAnimationDefinition)
                            .play()
                            .then(cleanupAndFinish.bind(this))
                            .catch((ex) => {
                            if (Trace.isEnabled()) {
                                Trace.write(`Error playing exit animation: ${ex}`, Trace.categories.Layout, Trace.messageType.error);
                            }
                        });
                    }
                    else {
                        cleanupAndFinish();
                    }
                }
                catch (ex) {
                    if (Trace.isEnabled()) {
                        Trace.write(`Error closing popup (${view}): ${ex}`, Trace.categories.Layout, Trace.messageType.error);
                    }
                }
            }
            else {
                if (Trace.isEnabled()) {
                    Trace.write(`Unable to close popup. ${view} not found`, Trace.categories.Layout);
                }
            }
        });
    }
    closeAll() {
        return new Promise((resolve, reject) => {
            try {
                while (this.popupViews.length > 0) {
                    // remove all children in the popupViews array
                    this.close(this.popupViews[this.popupViews.length - 1].view);
                }
                resolve();
            }
            catch (ex) {
                if (Trace.isEnabled()) {
                    Trace.write(`Error closing popups: ${ex}`, Trace.categories.Layout, Trace.messageType.error);
                }
            }
        });
    }
    getShadeCover() {
        return this.shadeCover;
    }
    openShadeCover(options) {
        if (this.shadeCover) {
            if (Trace.isEnabled()) {
                Trace.write(`RootLayout shadeCover already open.`, Trace.categories.Layout, Trace.messageType.warn);
            }
        }
        else {
            // create the one and only shade cover
            this.shadeCover = this.createShadeCover(options);
            // insert shade cover at index right above the first layout
            this.insertChild(this.shadeCover, this.staticChildCount + 1);
        }
    }
    closeShadeCover(shadeCoverOptions) {
        return new Promise((resolve) => {
            // if shade cover is displayed and the last popup is closed, also close the shade cover
            if (this.shadeCover) {
                return this._closeShadeCover(this.shadeCover, shadeCoverOptions).then(() => {
                    if (this.shadeCover) {
                        this.shadeCover.off('loaded');
                        if (this.shadeCover.parent) {
                            this.removeChild(this.shadeCover);
                        }
                    }
                    this.shadeCover = null;
                    // cleanup any platform specific details related to shade cover
                    this._cleanupPlatformShadeCover();
                    resolve();
                });
            }
            resolve();
        });
    }
    // bring any view instance open on the rootlayout to front of all the children visually
    bringToFront(view, animated = false) {
        return new Promise((resolve, reject) => {
            var _a;
            try {
                const popupIndex = this.getPopupIndex(view);
                // popupview should be present and not already the topmost view
                if (popupIndex > -1 && popupIndex !== this.popupViews.length - 1) {
                    // keep the popupViews array in sync with the stacking of the views
                    const currentView = this.popupViews[this.getPopupIndex(view)];
                    this.popupViews.splice(this.getPopupIndex(view), 1);
                    this.popupViews.push(currentView);
                    if (this.hasChild(view)) {
                        const exitAnimation = this.getViewExitState(view);
                        if (animated && exitAnimation) {
                            this.getExitAnimation(view, exitAnimation)
                                .play()
                                .then(() => {
                                this._bringToFront(view);
                                const initialState = this.getViewInitialState(currentView.view);
                                if (initialState) {
                                    this.applyInitialState(view, initialState);
                                    this.getEnterAnimation(view, initialState)
                                        .play()
                                        .then(() => {
                                        this.applyDefaultState(view);
                                    })
                                        .catch((ex) => {
                                        if (Trace.isEnabled()) {
                                            Trace.write(`Error playing enter animation: ${ex}`, Trace.categories.Layout, Trace.messageType.error);
                                        }
                                    });
                                }
                                else {
                                    this.applyDefaultState(view);
                                }
                            })
                                .catch((ex) => {
                                if (Trace.isEnabled()) {
                                    Trace.write(`Error playing exit animation: ${ex}`, Trace.categories.Layout, Trace.messageType.error);
                                }
                                this._bringToFront(view);
                            });
                        }
                        else {
                            this._bringToFront(view);
                        }
                    }
                    // update shadeCover to reflect topmost's shadeCover options
                    const shadeCoverOptions = (_a = currentView === null || currentView === void 0 ? void 0 : currentView.options) === null || _a === void 0 ? void 0 : _a.shadeCover;
                    if (shadeCoverOptions) {
                        this.updateShadeCover(this.shadeCover, shadeCoverOptions);
                    }
                    resolve();
                }
                else {
                    if (Trace.isEnabled()) {
                        Trace.write(`${view} not found or already at topmost`, Trace.categories.Layout);
                    }
                }
            }
            catch (ex) {
                if (Trace.isEnabled()) {
                    Trace.write(`Error in bringing view to front: ${ex}`, Trace.categories.Layout, Trace.messageType.error);
                }
            }
        });
    }
    getPopupIndex(view) {
        return this.popupViews.findIndex((popupView) => popupView.view === view);
    }
    getViewInitialState(view) {
        var _a, _b, _c;
        const popupIndex = this.getPopupIndex(view);
        if (popupIndex === -1) {
            return;
        }
        const initialState = (_c = (_b = (_a = this.popupViews[popupIndex]) === null || _a === void 0 ? void 0 : _a.options) === null || _b === void 0 ? void 0 : _b.animation) === null || _c === void 0 ? void 0 : _c.enterFrom;
        if (!initialState) {
            return;
        }
        return initialState;
    }
    getViewExitState(view) {
        var _a, _b, _c;
        const popupIndex = this.getPopupIndex(view);
        if (popupIndex === -1) {
            return;
        }
        const exitAnimation = (_c = (_b = (_a = this.popupViews[popupIndex]) === null || _a === void 0 ? void 0 : _a.options) === null || _b === void 0 ? void 0 : _b.animation) === null || _c === void 0 ? void 0 : _c.exitTo;
        if (!exitAnimation) {
            return;
        }
        return exitAnimation;
    }
    applyInitialState(targetView, enterFrom) {
        const animationOptions = Object.assign(Object.assign({}, defaultTransitionAnimation), (enterFrom || {}));
        targetView.translateX = animationOptions.translateX;
        targetView.translateY = animationOptions.translateY;
        targetView.scaleX = animationOptions.scaleX;
        targetView.scaleY = animationOptions.scaleY;
        targetView.rotate = animationOptions.rotate;
        targetView.opacity = animationOptions.opacity;
    }
    applyDefaultState(targetView) {
        targetView.translateX = 0;
        targetView.translateY = 0;
        targetView.scaleX = 1;
        targetView.scaleY = 1;
        targetView.rotate = 0;
        targetView.opacity = 1;
    }
    getEnterAnimation(targetView, enterFrom) {
        const animationOptions = Object.assign(Object.assign({}, defaultTransitionAnimation), (enterFrom || {}));
        return new Animation([
            {
                target: targetView,
                translate: { x: 0, y: 0 },
                scale: { x: 1, y: 1 },
                rotate: 0,
                opacity: 1,
                duration: animationOptions.duration,
                curve: animationOptions.curve,
            },
        ]);
    }
    getExitAnimation(targetView, exitTo) {
        return new Animation([this.getExitAnimationDefinition(targetView, exitTo)]);
    }
    getExitAnimationDefinition(targetView, exitTo) {
        return Object.assign(Object.assign(Object.assign({ target: targetView }, defaultTransitionAnimation), (exitTo || {})), { translate: { x: exitTo.translateX || defaultTransitionAnimation.translateX, y: exitTo.translateY || defaultTransitionAnimation.translateY }, scale: { x: exitTo.scaleX || defaultTransitionAnimation.scaleX, y: exitTo.scaleY || defaultTransitionAnimation.scaleY } });
    }
    createShadeCover(shadeOptions) {
        const shadeCover = new GridLayout();
        shadeCover.verticalAlignment = 'bottom';
        shadeCover.on('loaded', () => {
            this._initShadeCover(shadeCover, shadeOptions);
            this.updateShadeCover(shadeCover, shadeOptions);
        });
        return shadeCover;
    }
    updateShadeCover(shade, shadeOptions) {
        if (shadeOptions.tapToClose !== undefined && shadeOptions.tapToClose !== null) {
            shade.off('tap');
            if (shadeOptions.tapToClose) {
                shade.on('tap', () => {
                    this.closeAll();
                });
            }
        }
        this._updateShadeCover(shade, shadeOptions);
    }
    hasChild(view) {
        return this.getChildIndex(view) >= 0;
    }
    _bringToFront(view) { }
    _initShadeCover(view, shadeOption) { }
    _updateShadeCover(view, shadeOption) {
        return new Promise(() => { });
    }
    _closeShadeCover(view, shadeOptions) {
        return new Promise(() => { });
    }
    _cleanupPlatformShadeCover() { }
};
RootLayoutBase = __decorate([
    CSSType('RootLayout'),
    __metadata("design:paramtypes", [])
], RootLayoutBase);
export { RootLayoutBase };
export function getRootLayout() {
    return global.rootLayout;
}
export const defaultTransitionAnimation = {
    translateX: 0,
    translateY: 0,
    scaleX: 1,
    scaleY: 1,
    rotate: 0,
    opacity: 1,
    duration: 300,
    curve: CoreTypes.AnimationCurve.easeIn,
};
export const defaultShadeCoverTransitionAnimation = Object.assign(Object.assign({}, defaultTransitionAnimation), { opacity: 0 });
export const defaultShadeCoverOptions = {
    opacity: 0.5,
    color: '#000000',
    tapToClose: true,
    animation: {
        enterFrom: defaultShadeCoverTransitionAnimation,
        exitTo: defaultShadeCoverTransitionAnimation,
    },
    ignoreShadeRestore: false,
};
//# sourceMappingURL=root-layout-common.js.map