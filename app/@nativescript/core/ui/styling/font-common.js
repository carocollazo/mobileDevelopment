import { makeValidator, makeParser } from '../core/properties';
export * from './font-interfaces';
export class Font {
    constructor(fontFamily, fontSize, fontStyle, fontWeight, fontScale) {
        this.fontFamily = fontFamily;
        this.fontSize = fontSize;
        this.fontStyle = fontStyle;
        this.fontWeight = fontWeight;
        this.fontScale = fontScale;
    }
    get isItalic() {
        return this.fontStyle === FontStyle.ITALIC;
    }
    get isBold() {
        return this.fontWeight === FontWeight.SEMI_BOLD || this.fontWeight === FontWeight.BOLD || this.fontWeight === '700' || this.fontWeight === FontWeight.EXTRA_BOLD || this.fontWeight === FontWeight.BLACK;
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
        return value1.fontFamily === value2.fontFamily && value1.fontSize === value2.fontSize && value1.fontStyle === value2.fontStyle && value1.fontWeight === value2.fontWeight;
    }
}
Font.default = undefined;
export var FontStyle;
(function (FontStyle) {
    FontStyle.NORMAL = 'normal';
    FontStyle.ITALIC = 'italic';
    FontStyle.isValid = makeValidator(FontStyle.NORMAL, FontStyle.ITALIC);
    FontStyle.parse = makeParser(FontStyle.isValid);
})(FontStyle || (FontStyle = {}));
export var FontWeight;
(function (FontWeight) {
    FontWeight.THIN = '100';
    FontWeight.EXTRA_LIGHT = '200';
    FontWeight.LIGHT = '300';
    FontWeight.NORMAL = 'normal';
    FontWeight.MEDIUM = '500';
    FontWeight.SEMI_BOLD = '600';
    FontWeight.BOLD = 'bold';
    FontWeight.EXTRA_BOLD = '800';
    FontWeight.BLACK = '900';
    FontWeight.isValid = makeValidator(FontWeight.THIN, FontWeight.EXTRA_LIGHT, FontWeight.LIGHT, FontWeight.NORMAL, '400', FontWeight.MEDIUM, FontWeight.SEMI_BOLD, FontWeight.BOLD, '700', FontWeight.EXTRA_BOLD, FontWeight.BLACK);
    FontWeight.parse = makeParser(FontWeight.isValid);
})(FontWeight || (FontWeight = {}));
export function parseFontFamily(value) {
    if (!value) {
        return [];
    }
    return value
        .split(',')
        .map((v) => (v || '').trim().replace(/['"]+/g, ''))
        .filter((v) => !!v);
}
export var genericFontFamilies;
(function (genericFontFamilies) {
    genericFontFamilies.serif = 'serif';
    genericFontFamilies.sansSerif = 'sans-serif';
    genericFontFamilies.monospace = 'monospace';
    genericFontFamilies.system = 'system';
})(genericFontFamilies || (genericFontFamilies = {}));
const styles = new Set();
[FontStyle.NORMAL, FontStyle.ITALIC].forEach((val, i, a) => styles.add(val));
// http://www.w3schools.com/cssref/pr_font_weight.asp
//- normal(same as 400)
//- bold(same as 700)
//- 100(Thin) (API16 -thin)
//- 200(Extra Light / Ultra Light) (API16 -light)
//- 300(Light) (API16 -light)
//- 400(Normal)
//- 500(Medium) (API21 -medium)
//- 600(Semi Bold / Demi Bold) (API21 -medium)
//- 700(Bold) (API16 -bold)
//- 800(Extra Bold / Ultra Bold) (API16 -bold)
//- 900(Black / Heavy) (API21 -black)
const weights = new Set();
[FontWeight.THIN, FontWeight.EXTRA_LIGHT, FontWeight.LIGHT, FontWeight.NORMAL, '400', FontWeight.MEDIUM, FontWeight.SEMI_BOLD, FontWeight.BOLD, '700', FontWeight.EXTRA_BOLD, FontWeight.BLACK].forEach((val, i, a) => weights.add(val));
export function parseFont(fontValue) {
    const result = {
        fontStyle: 'normal',
        fontVariant: 'normal',
        fontWeight: 'normal',
    };
    const parts = fontValue.split(/\s+/);
    let part;
    while ((part = parts.shift())) {
        if (part === 'normal') {
            // nothing to do here
        }
        else if (part === 'small-caps') {
            // The only supported font variant in shorthand font
            result.fontVariant = part;
        }
        else if (styles.has(part)) {
            result.fontStyle = part;
        }
        else if (weights.has(part)) {
            result.fontWeight = part;
        }
        else if (!result.fontSize) {
            const sizes = part.split('/');
            result.fontSize = sizes[0];
            result.lineHeight = sizes.length > 1 ? sizes[1] : undefined;
        }
        else {
            result.fontFamily = part;
            if (parts.length) {
                result.fontFamily += ' ' + parts.join(' ');
            }
            break;
        }
    }
    return result;
}
//# sourceMappingURL=font-common.js.map