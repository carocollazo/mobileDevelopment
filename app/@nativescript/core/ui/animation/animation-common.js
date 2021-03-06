// Requires.
import { Color } from '../../color';
import { Trace } from '../../trace';
import { PercentLength } from '../styling/style-properties';
export * from './animation-interfaces';
export var Properties;
(function (Properties) {
    Properties.opacity = 'opacity';
    Properties.backgroundColor = 'backgroundColor';
    Properties.translate = 'translate';
    Properties.rotate = 'rotate';
    Properties.scale = 'scale';
    Properties.height = 'height';
    Properties.width = 'width';
})(Properties || (Properties = {}));
export class CubicBezierAnimationCurve {
    constructor(x1, y1, x2, y2) {
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
    }
}
export class AnimationBase {
    constructor(animationDefinitions, playSequentially) {
        if (!animationDefinitions || animationDefinitions.length === 0) {
            throw new Error('No animation definitions specified');
        }
        if (Trace.isEnabled()) {
            Trace.write('Analyzing ' + animationDefinitions.length + ' animation definitions...', Trace.categories.Animation);
        }
        this._propertyAnimations = new Array();
        for (let i = 0, length = animationDefinitions.length; i < length; i++) {
            if (animationDefinitions[i].curve) {
                animationDefinitions[i].curve = this._resolveAnimationCurve(animationDefinitions[i].curve);
            }
            this._propertyAnimations = this._propertyAnimations.concat(AnimationBase._createPropertyAnimations(animationDefinitions[i]));
        }
        if (this._propertyAnimations.length === 0) {
            throw new Error('Nothing to animate.');
        }
        if (Trace.isEnabled()) {
            Trace.write('Created ' + this._propertyAnimations.length + ' individual property animations.', Trace.categories.Animation);
        }
        this._playSequentially = playSequentially;
    }
    _rejectAlreadyPlaying() {
        const reason = 'Animation is already playing.';
        Trace.write(reason, Trace.categories.Animation, Trace.messageType.warn);
        return new Promise((resolve, reject) => {
            reject(reason);
        });
    }
    play() {
        // We have to actually create a "Promise" due to a bug in the v8 engine and decedent promises
        // We just cast it to a animationPromise so that all the rest of the code works fine
        const animationFinishedPromise = new Promise((resolve, reject) => {
            this._resolve = resolve;
            this._reject = reject;
        });
        this.fixupAnimationPromise(animationFinishedPromise);
        this._isPlaying = true;
        return animationFinishedPromise;
    }
    fixupAnimationPromise(promise) {
        // Since we are using function() below because of arguments, TS won't automatically do a _this for those functions.
        const _this = this;
        promise.cancel = () => {
            _this.cancel();
        };
        const _then = promise.then;
        promise.then = function () {
            // eslint-disable-next-line prefer-rest-params
            const r = _then.apply(promise, arguments);
            _this.fixupAnimationPromise(r);
            return r;
        };
        const _catch = promise.catch;
        promise.catch = function () {
            // eslint-disable-next-line prefer-rest-params
            const r = _catch.apply(promise, arguments);
            _this.fixupAnimationPromise(r);
            return r;
        };
    }
    cancel() {
        // Implemented in platform specific files
    }
    get isPlaying() {
        return this._isPlaying;
    }
    _resolveAnimationFinishedPromise() {
        this._isPlaying = false;
        this._resolve();
    }
    _rejectAnimationFinishedPromise() {
        this._isPlaying = false;
        this._reject(new Error('Animation cancelled.'));
    }
    static _createPropertyAnimations(animationDefinition) {
        if (!animationDefinition.target) {
            throw new Error('No animation target specified.');
        }
        for (const item in animationDefinition) {
            const value = animationDefinition[item];
            if (value === undefined) {
                continue;
            }
            if ((item === Properties.opacity || item === 'duration' || item === 'delay' || item === 'iterations') && typeof value !== 'number') {
                throw new Error(`Property ${item} must be valid number. Value: ${value}`);
            }
            else if ((item === Properties.scale || item === Properties.translate) && (typeof value.x !== 'number' || typeof value.y !== 'number')) {
                throw new Error(`Property ${item} must be valid Pair. Value: ${value}`);
            }
            else if (item === Properties.backgroundColor && !Color.isValid(animationDefinition.backgroundColor)) {
                throw new Error(`Property ${item} must be valid color. Value: ${value}`);
            }
            else if (item === Properties.width || item === Properties.height) {
                // Coerce input into a PercentLength object in case it's a string.
                animationDefinition[item] = PercentLength.parse(value);
            }
            else if (item === Properties.rotate) {
                const rotate = value;
                if (typeof rotate !== 'number' && !(typeof rotate.x === 'number' && typeof rotate.y === 'number' && typeof rotate.z === 'number')) {
                    throw new Error(`Property ${rotate} must be valid number or Point3D. Value: ${value}`);
                }
            }
        }
        const propertyAnimations = new Array();
        // opacity
        if (animationDefinition.opacity !== undefined) {
            propertyAnimations.push({
                target: animationDefinition.target,
                property: Properties.opacity,
                value: animationDefinition.opacity,
                duration: animationDefinition.duration,
                delay: animationDefinition.delay,
                iterations: animationDefinition.iterations,
                curve: animationDefinition.curve,
            });
        }
        // backgroundColor
        if (animationDefinition.backgroundColor !== undefined) {
            propertyAnimations.push({
                target: animationDefinition.target,
                property: Properties.backgroundColor,
                value: typeof animationDefinition.backgroundColor === 'string' ? new Color(animationDefinition.backgroundColor) : animationDefinition.backgroundColor,
                duration: animationDefinition.duration,
                delay: animationDefinition.delay,
                iterations: animationDefinition.iterations,
                curve: animationDefinition.curve,
            });
        }
        // translate
        if (animationDefinition.translate !== undefined) {
            propertyAnimations.push({
                target: animationDefinition.target,
                property: Properties.translate,
                value: animationDefinition.translate,
                duration: animationDefinition.duration,
                delay: animationDefinition.delay,
                iterations: animationDefinition.iterations,
                curve: animationDefinition.curve,
            });
        }
        // scale
        if (animationDefinition.scale !== undefined) {
            propertyAnimations.push({
                target: animationDefinition.target,
                property: Properties.scale,
                value: animationDefinition.scale,
                duration: animationDefinition.duration,
                delay: animationDefinition.delay,
                iterations: animationDefinition.iterations,
                curve: animationDefinition.curve,
            });
        }
        // rotate
        if (animationDefinition.rotate !== undefined) {
            // Make sure the value of the rotation property is always Point3D
            let rotationValue;
            if (typeof animationDefinition.rotate === 'number') {
                rotationValue = { x: 0, y: 0, z: animationDefinition.rotate };
            }
            else {
                rotationValue = animationDefinition.rotate;
            }
            propertyAnimations.push({
                target: animationDefinition.target,
                property: Properties.rotate,
                value: rotationValue,
                duration: animationDefinition.duration,
                delay: animationDefinition.delay,
                iterations: animationDefinition.iterations,
                curve: animationDefinition.curve,
            });
        }
        // height
        if (animationDefinition.height !== undefined) {
            propertyAnimations.push({
                target: animationDefinition.target,
                property: Properties.height,
                value: animationDefinition.height,
                duration: animationDefinition.duration,
                delay: animationDefinition.delay,
                iterations: animationDefinition.iterations,
                curve: animationDefinition.curve,
            });
        }
        // width
        if (animationDefinition.width !== undefined) {
            propertyAnimations.push({
                target: animationDefinition.target,
                property: Properties.width,
                value: animationDefinition.width,
                duration: animationDefinition.duration,
                delay: animationDefinition.delay,
                iterations: animationDefinition.iterations,
                curve: animationDefinition.curve,
            });
        }
        if (propertyAnimations.length === 0) {
            throw new Error('No known animation properties specified');
        }
        return propertyAnimations;
    }
    static _getAnimationInfo(animation) {
        return JSON.stringify({
            target: animation.target.id,
            property: animation.property,
            value: animation.value,
            duration: animation.duration,
            delay: animation.delay,
            iterations: animation.iterations,
            curve: animation.curve,
        });
    }
}
//# sourceMappingURL=animation-common.js.map