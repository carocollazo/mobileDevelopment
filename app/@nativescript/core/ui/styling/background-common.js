import { LinearGradient } from './linear-gradient';
// Types.
import { Color } from '../../color';
export class Background {
    constructor() {
        this.borderTopWidth = 0;
        this.borderRightWidth = 0;
        this.borderBottomWidth = 0;
        this.borderLeftWidth = 0;
        this.borderTopLeftRadius = 0;
        this.borderTopRightRadius = 0;
        this.borderBottomLeftRadius = 0;
        this.borderBottomRightRadius = 0;
        this.clearFlags = 0 /* NONE */;
    }
    clone() {
        const clone = new Background();
        clone.color = this.color;
        clone.image = this.image;
        clone.repeat = this.repeat;
        clone.position = this.position;
        clone.size = this.size;
        clone.borderTopColor = this.borderTopColor;
        clone.borderRightColor = this.borderRightColor;
        clone.borderBottomColor = this.borderBottomColor;
        clone.borderLeftColor = this.borderLeftColor;
        clone.borderTopWidth = this.borderTopWidth;
        clone.borderRightWidth = this.borderRightWidth;
        clone.borderBottomWidth = this.borderBottomWidth;
        clone.borderLeftWidth = this.borderLeftWidth;
        clone.borderTopLeftRadius = this.borderTopLeftRadius;
        clone.borderTopRightRadius = this.borderTopRightRadius;
        clone.borderBottomRightRadius = this.borderBottomRightRadius;
        clone.borderBottomLeftRadius = this.borderBottomLeftRadius;
        clone.clipPath = this.clipPath;
        clone.boxShadow = this.boxShadow;
        clone.clearFlags = this.clearFlags;
        return clone;
    }
    withColor(value) {
        const clone = this.clone();
        clone.color = value;
        if (!value) {
            clone.clearFlags |= 1 /* CLEAR_BACKGROUND_COLOR */;
        }
        return clone;
    }
    withImage(value) {
        const clone = this.clone();
        clone.image = value;
        return clone;
    }
    withRepeat(value) {
        const clone = this.clone();
        clone.repeat = value;
        return clone;
    }
    withPosition(value) {
        const clone = this.clone();
        clone.position = value;
        return clone;
    }
    withSize(value) {
        const clone = this.clone();
        clone.size = value;
        return clone;
    }
    withBorderTopColor(value) {
        const clone = this.clone();
        clone.borderTopColor = value;
        return clone;
    }
    withBorderRightColor(value) {
        const clone = this.clone();
        clone.borderRightColor = value;
        return clone;
    }
    withBorderBottomColor(value) {
        const clone = this.clone();
        clone.borderBottomColor = value;
        return clone;
    }
    withBorderLeftColor(value) {
        const clone = this.clone();
        clone.borderLeftColor = value;
        return clone;
    }
    withBorderTopWidth(value) {
        const clone = this.clone();
        clone.borderTopWidth = value;
        return clone;
    }
    withBorderRightWidth(value) {
        const clone = this.clone();
        clone.borderRightWidth = value;
        return clone;
    }
    withBorderBottomWidth(value) {
        const clone = this.clone();
        clone.borderBottomWidth = value;
        return clone;
    }
    withBorderLeftWidth(value) {
        const clone = this.clone();
        clone.borderLeftWidth = value;
        return clone;
    }
    withBorderTopLeftRadius(value) {
        const clone = this.clone();
        clone.borderTopLeftRadius = value;
        return clone;
    }
    withBorderTopRightRadius(value) {
        const clone = this.clone();
        clone.borderTopRightRadius = value;
        return clone;
    }
    withBorderBottomRightRadius(value) {
        const clone = this.clone();
        clone.borderBottomRightRadius = value;
        return clone;
    }
    withBorderBottomLeftRadius(value) {
        const clone = this.clone();
        clone.borderBottomLeftRadius = value;
        return clone;
    }
    withClipPath(value) {
        const clone = this.clone();
        clone.clipPath = value;
        return clone;
    }
    withBoxShadow(value) {
        const clone = this.clone();
        clone.boxShadow = value;
        if (!value) {
            clone.clearFlags |= 2 /* CLEAR_BOX_SHADOW */;
        }
        return clone;
    }
    isEmpty() {
        return !this.color && !this.image && !this.hasBorderWidth() && !this.hasBorderRadius() && !this.clipPath;
    }
    static equals(value1, value2) {
        // both values are falsy
        if (!value1 && !value2) {
            return true;
        }
        // only one is falsy
        if (!value1 || !value2) {
            return false;
        }
        let imagesEqual = false;
        if (value1 instanceof LinearGradient && value2 instanceof LinearGradient) {
            imagesEqual = LinearGradient.equals(value1, value2);
        }
        else {
            imagesEqual = value1.image === value2.image;
        }
        return (Color.equals(value1.color, value2.color) &&
            imagesEqual &&
            value1.position === value2.position &&
            value1.repeat === value2.repeat &&
            value1.size === value2.size &&
            Color.equals(value1.borderTopColor, value2.borderTopColor) &&
            Color.equals(value1.borderRightColor, value2.borderRightColor) &&
            Color.equals(value1.borderBottomColor, value2.borderBottomColor) &&
            Color.equals(value1.borderLeftColor, value2.borderLeftColor) &&
            value1.borderTopWidth === value2.borderTopWidth &&
            value1.borderRightWidth === value2.borderRightWidth &&
            value1.borderBottomWidth === value2.borderBottomWidth &&
            value1.borderLeftWidth === value2.borderLeftWidth &&
            value1.borderTopLeftRadius === value2.borderTopLeftRadius &&
            value1.borderTopRightRadius === value2.borderTopRightRadius &&
            value1.borderBottomRightRadius === value2.borderBottomRightRadius &&
            value1.borderBottomLeftRadius === value2.borderBottomLeftRadius &&
            value1.clipPath === value2.clipPath
        // && value1.clearFlags === value2.clearFlags
        );
    }
    hasBorderColor() {
        return !!this.borderTopColor || !!this.borderRightColor || !!this.borderBottomColor || !!this.borderLeftColor;
    }
    hasBorderWidth() {
        return this.borderTopWidth > 0 || this.borderRightWidth > 0 || this.borderBottomWidth > 0 || this.borderLeftWidth > 0;
    }
    hasBorderRadius() {
        return this.borderTopLeftRadius > 0 || this.borderTopRightRadius > 0 || this.borderBottomRightRadius > 0 || this.borderBottomLeftRadius > 0;
    }
    hasUniformBorderColor() {
        return Color.equals(this.borderTopColor, this.borderRightColor) && Color.equals(this.borderTopColor, this.borderBottomColor) && Color.equals(this.borderTopColor, this.borderLeftColor);
    }
    hasUniformBorderWidth() {
        return this.borderTopWidth === this.borderRightWidth && this.borderTopWidth === this.borderBottomWidth && this.borderTopWidth === this.borderLeftWidth;
    }
    hasUniformBorderRadius() {
        return this.borderTopLeftRadius === this.borderTopRightRadius && this.borderTopLeftRadius === this.borderBottomRightRadius && this.borderTopLeftRadius === this.borderBottomLeftRadius;
    }
    hasUniformBorder() {
        return this.hasUniformBorderColor() && this.hasUniformBorderWidth() && this.hasUniformBorderRadius();
    }
    getUniformBorderColor() {
        if (this.hasUniformBorderColor()) {
            return this.borderTopColor;
        }
        return undefined;
    }
    getUniformBorderWidth() {
        if (this.hasUniformBorderWidth()) {
            return this.borderTopWidth;
        }
        return 0;
    }
    getUniformBorderRadius() {
        if (this.hasUniformBorderRadius()) {
            return this.borderTopLeftRadius;
        }
        return 0;
    }
    hasBoxShadow() {
        return !!this.boxShadow;
    }
    getBoxShadow() {
        return this.boxShadow;
    }
    toString() {
        return `isEmpty: ${this.isEmpty()}; color: ${this.color}; image: ${this.image}; repeat: ${this.repeat}; position: ${this.position}; size: ${this.size}; borderTopColor: ${this.borderTopColor}; borderRightColor: ${this.borderRightColor}; borderBottomColor: ${this.borderBottomColor}; borderLeftColor: ${this.borderLeftColor}; borderTopWidth: ${this.borderTopWidth}; borderRightWidth: ${this.borderRightWidth}; borderBottomWidth: ${this.borderBottomWidth}; borderLeftWidth: ${this.borderLeftWidth}; borderTopLeftRadius: ${this.borderTopLeftRadius}; borderTopRightRadius: ${this.borderTopRightRadius}; borderBottomRightRadius: ${this.borderBottomRightRadius}; borderBottomLeftRadius: ${this.borderBottomLeftRadius}; clipPath: ${this.clipPath};`;
    }
}
Background.default = new Background();
//# sourceMappingURL=background-common.js.map