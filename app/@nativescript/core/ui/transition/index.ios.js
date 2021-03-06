let transitionId = 0;
export class Transition {
    constructor(duration, curve = 0 /* EaseInOut */) {
        this._duration = duration ? duration / 1000 : 0.35;
        this._curve = curve;
        this._id = transitionId++;
    }
    getDuration() {
        return this._duration;
    }
    getCurve() {
        return this._curve;
    }
    animateIOSTransition(containerView, fromView, toView, operation, completion) {
        throw new Error('Abstract method call');
    }
    createAndroidAnimator(transitionType) {
        throw new Error('Abstract method call');
    }
    toString() {
        return `Transition@${this._id}`;
    }
}
Transition.AndroidTransitionType = {};
//# sourceMappingURL=index.ios.js.map