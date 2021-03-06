import { ImageBase, stretchProperty, imageSourceProperty, tintColorProperty, srcProperty } from './image-common';
import { Trace } from '../../trace';
import { layout, queueGC } from '../../utils';
export * from './image-common';
export class Image extends ImageBase {
    constructor() {
        super(...arguments);
        this._imageSourceAffectsLayout = true;
    }
    createNativeView() {
        const imageView = UIImageView.new();
        imageView.contentMode = 1 /* ScaleAspectFit */;
        imageView.userInteractionEnabled = true;
        return imageView;
    }
    initNativeView() {
        super.initNativeView();
        this._setNativeClipToBounds();
    }
    disposeImageSource() {
        var _a, _b, _c;
        if (((_a = this.nativeViewProtected) === null || _a === void 0 ? void 0 : _a.image) === ((_b = this.imageSource) === null || _b === void 0 ? void 0 : _b.ios)) {
            this.nativeViewProtected.image = null;
        }
        if ((_c = this.imageSource) === null || _c === void 0 ? void 0 : _c.ios) {
            this.imageSource.ios = null;
        }
        this.imageSource = null;
        queueGC();
    }
    disposeNativeView() {
        var _a;
        super.disposeNativeView();
        if ((_a = this.nativeViewProtected) === null || _a === void 0 ? void 0 : _a.image) {
            this.nativeViewProtected.image = null;
        }
        this.disposeImageSource();
    }
    setTintColor(value) {
        if (this.nativeViewProtected) {
            if (value && this.nativeViewProtected.image && !this._templateImageWasCreated) {
                this.nativeViewProtected.image = this.nativeViewProtected.image.imageWithRenderingMode(2 /* AlwaysTemplate */);
                this._templateImageWasCreated = true;
                queueGC();
            }
            else if (!value && this.nativeViewProtected.image && this._templateImageWasCreated) {
                this._templateImageWasCreated = false;
                this.nativeViewProtected.image = this.nativeViewProtected.image.imageWithRenderingMode(0 /* Automatic */);
                queueGC();
            }
            this.nativeViewProtected.tintColor = value ? value.ios : null;
        }
    }
    _setNativeImage(nativeImage) {
        var _a, _b;
        if ((_a = this.nativeViewProtected) === null || _a === void 0 ? void 0 : _a.image) {
            this.nativeViewProtected.image = null;
            queueGC();
        }
        if (this.nativeViewProtected) {
            this.nativeViewProtected.image = nativeImage;
        }
        this._templateImageWasCreated = false;
        this.setTintColor((_b = this.style) === null || _b === void 0 ? void 0 : _b.tintColor);
        if (this._imageSourceAffectsLayout) {
            this.requestLayout();
        }
    }
    _setNativeClipToBounds() {
        if (this.nativeViewProtected) {
            // Always set clipsToBounds for images
            this.nativeViewProtected.clipsToBounds = true;
        }
    }
    onMeasure(widthMeasureSpec, heightMeasureSpec) {
        // We don't call super because we measure native view with specific size.
        const width = layout.getMeasureSpecSize(widthMeasureSpec);
        const widthMode = layout.getMeasureSpecMode(widthMeasureSpec);
        const height = layout.getMeasureSpecSize(heightMeasureSpec);
        const heightMode = layout.getMeasureSpecMode(heightMeasureSpec);
        const nativeWidth = this.imageSource ? layout.toDevicePixels(this.imageSource.width) : 0;
        const nativeHeight = this.imageSource ? layout.toDevicePixels(this.imageSource.height) : 0;
        let measureWidth = Math.max(nativeWidth, this.effectiveMinWidth);
        let measureHeight = Math.max(nativeHeight, this.effectiveMinHeight);
        const finiteWidth = widthMode !== layout.UNSPECIFIED;
        const finiteHeight = heightMode !== layout.UNSPECIFIED;
        this._imageSourceAffectsLayout = widthMode !== layout.EXACTLY || heightMode !== layout.EXACTLY;
        if (nativeWidth !== 0 && nativeHeight !== 0 && (finiteWidth || finiteHeight)) {
            const scale = Image.computeScaleFactor(width, height, finiteWidth, finiteHeight, nativeWidth, nativeHeight, this.stretch);
            const resultW = Math.round(nativeWidth * scale.width);
            const resultH = Math.round(nativeHeight * scale.height);
            measureWidth = finiteWidth ? Math.min(resultW, width) : resultW;
            measureHeight = finiteHeight ? Math.min(resultH, height) : resultH;
            if (Trace.isEnabled()) {
                Trace.write('Image stretch: ' + this.stretch + ', nativeWidth: ' + nativeWidth + ', nativeHeight: ' + nativeHeight, Trace.categories.Layout);
            }
        }
        const widthAndState = Image.resolveSizeAndState(measureWidth, width, widthMode, 0);
        const heightAndState = Image.resolveSizeAndState(measureHeight, height, heightMode, 0);
        this.setMeasuredDimension(widthAndState, heightAndState);
    }
    static computeScaleFactor(measureWidth, measureHeight, widthIsFinite, heightIsFinite, nativeWidth, nativeHeight, imageStretch) {
        let scaleW = 1;
        let scaleH = 1;
        if ((imageStretch === 'aspectFill' || imageStretch === 'aspectFit' || imageStretch === 'fill') && (widthIsFinite || heightIsFinite)) {
            scaleW = nativeWidth > 0 ? measureWidth / nativeWidth : 0;
            scaleH = nativeHeight > 0 ? measureHeight / nativeHeight : 0;
            if (!widthIsFinite) {
                scaleW = scaleH;
            }
            else if (!heightIsFinite) {
                scaleH = scaleW;
            }
            else {
                // No infinite dimensions.
                switch (imageStretch) {
                    case 'aspectFit':
                        scaleH = scaleW < scaleH ? scaleW : scaleH;
                        scaleW = scaleH;
                        break;
                    case 'aspectFill':
                        scaleH = scaleW > scaleH ? scaleW : scaleH;
                        scaleW = scaleH;
                        break;
                }
            }
        }
        return { width: scaleW, height: scaleH };
    }
    [stretchProperty.setNative](value) {
        if (this.nativeViewProtected) {
            switch (value) {
                case 'aspectFit':
                    this.nativeViewProtected.contentMode = 1 /* ScaleAspectFit */;
                    break;
                case 'aspectFill':
                    this.nativeViewProtected.contentMode = 2 /* ScaleAspectFill */;
                    break;
                case 'fill':
                    this.nativeViewProtected.contentMode = 0 /* ScaleToFill */;
                    break;
                case 'none':
                default:
                    this.nativeViewProtected.contentMode = 9 /* TopLeft */;
                    break;
            }
        }
    }
    [tintColorProperty.setNative](value) {
        this.setTintColor(value);
    }
    [imageSourceProperty.setNative](value) {
        if (value !== this.imageSource) {
            this.disposeImageSource();
        }
        this._setNativeImage(value ? value.ios : null);
    }
    [srcProperty.setNative](value) {
        this._createImageSourceFromSrc(value);
    }
}
//# sourceMappingURL=index.ios.js.map