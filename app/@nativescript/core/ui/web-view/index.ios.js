import { disableZoomProperty, WebViewBase } from './web-view-common';
import { profile } from '../../profiling';
import { Trace } from '../../trace';
export * from './web-view-common';
import { knownFolders } from '../../file-system';
var WKNavigationDelegateImpl = /** @class */ (function (_super) {
    __extends(WKNavigationDelegateImpl, _super);
    function WKNavigationDelegateImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    WKNavigationDelegateImpl.initWithOwner = function (owner) {
        var handler = WKNavigationDelegateImpl.new();
        handler._owner = owner;
        return handler;
    };
    WKNavigationDelegateImpl.prototype.webViewDecidePolicyForNavigationActionDecisionHandler = function (webView, navigationAction, decisionHandler) {
        var owner = this._owner.get();
        if (owner && navigationAction.request.URL) {
            var navType = 'other';
            switch (navigationAction.navigationType) {
                case WKNavigationType.LinkActivated:
                    navType = 'linkClicked';
                    break;
                case WKNavigationType.FormSubmitted:
                    navType = 'formSubmitted';
                    break;
                case WKNavigationType.BackForward:
                    navType = 'backForward';
                    break;
                case WKNavigationType.Reload:
                    navType = 'reload';
                    break;
                case WKNavigationType.FormResubmitted:
                    navType = 'formResubmitted';
                    break;
            }
            decisionHandler(WKNavigationActionPolicy.Allow);
            if (Trace.isEnabled()) {
                Trace.write('WKNavigationDelegateClass.webViewDecidePolicyForNavigationActionDecisionHandler(' + navigationAction.request.URL.absoluteString + ', ' + navigationAction.navigationType + ')', Trace.categories.Debug);
            }
            owner._onLoadStarted(navigationAction.request.URL.absoluteString, navType);
        }
    };
    WKNavigationDelegateImpl.prototype.webViewDidStartProvisionalNavigation = function (webView, navigation) {
        if (Trace.isEnabled()) {
            Trace.write('WKNavigationDelegateClass.webViewDidStartProvisionalNavigation(' + webView.URL + ')', Trace.categories.Debug);
        }
    };
    WKNavigationDelegateImpl.prototype.webViewDidFinishNavigation = function (webView, navigation) {
        if (Trace.isEnabled()) {
            Trace.write('WKNavigationDelegateClass.webViewDidFinishNavigation(' + webView.URL + ')', Trace.categories.Debug);
        }
        var owner = this._owner.get();
        if (owner) {
            var src = owner.src;
            if (webView.URL) {
                src = webView.URL.absoluteString;
            }
            owner._onLoadFinished(src);
        }
    };
    WKNavigationDelegateImpl.prototype.webViewDidFailNavigationWithError = function (webView, navigation, error) {
        var owner = this._owner.get();
        if (owner) {
            var src = owner.src;
            if (webView.URL) {
                src = webView.URL.absoluteString;
            }
            if (Trace.isEnabled()) {
                Trace.write('WKNavigationDelegateClass.webViewDidFailNavigationWithError(' + error.localizedDescription + ')', Trace.categories.Debug);
            }
            owner._onLoadFinished(src, error.localizedDescription);
        }
    };
    WKNavigationDelegateImpl.prototype.webViewDidFailProvisionalNavigationWithError = function (webView, navigation, error) {
        var owner = this._owner.get();
        if (owner) {
            var src = owner.src;
            if (webView.URL) {
                src = webView.URL.absoluteString;
            }
            if (Trace.isEnabled()) {
                Trace.write('WKNavigationDelegateClass.webViewDidFailProvisionalNavigationWithError(' + error.localizedDescription + ')', Trace.categories.Debug);
            }
            owner._onLoadFinished(src, error.localizedDescription);
        }
    };
    WKNavigationDelegateImpl.ObjCProtocols = [WKNavigationDelegate];
    return WKNavigationDelegateImpl;
}(NSObject));
var WKUIDelegateImpl = /** @class */ (function (_super) {
    __extends(WKUIDelegateImpl, _super);
    function WKUIDelegateImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    WKUIDelegateImpl.initWithOwner = function (owner) {
        var handler = WKUIDelegateImpl.new();
        handler._owner = owner;
        return handler;
    };
    WKUIDelegateImpl.prototype.webViewCreateWebViewWithConfigurationForNavigationActionWindowFeatures = function (webView, configuration, navigationAction, windowFeatures) {
        if (navigationAction && (!navigationAction.targetFrame || (navigationAction.targetFrame && !navigationAction.targetFrame.mainFrame))) {
            webView.loadRequest(navigationAction.request);
        }
        return null;
    };
    WKUIDelegateImpl.ObjCProtocols = [WKUIDelegate];
    return WKUIDelegateImpl;
}(NSObject));
var UIScrollViewDelegateImpl = /** @class */ (function (_super) {
    __extends(UIScrollViewDelegateImpl, _super);
    function UIScrollViewDelegateImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    UIScrollViewDelegateImpl_1 = UIScrollViewDelegateImpl;
    UIScrollViewDelegateImpl.initWithOwner = function (owner) {
        var handler = UIScrollViewDelegateImpl_1.new();
        handler._owner = owner;
        return handler;
    };
    UIScrollViewDelegateImpl.prototype._initCurrentValues = function (scrollView) {
        var owner = this._owner.get();
        if (owner && (owner._minimumZoomScale === undefined || owner._maximumZoomScale === undefined || owner._zoomScale === undefined)) {
            owner._minimumZoomScale = scrollView.minimumZoomScale;
            owner._maximumZoomScale = scrollView.maximumZoomScale;
            owner._zoomScale = scrollView.zoomScale;
        }
    };
    UIScrollViewDelegateImpl.prototype._handleDisableZoom = function (scrollView) {
        var owner = this._owner.get();
        if (owner.disableZoom) {
            this._initCurrentValues(scrollView);
            scrollView.maximumZoomScale = 1.0;
            scrollView.minimumZoomScale = 1.0;
            scrollView.zoomScale = 1.0;
        }
    };
    UIScrollViewDelegateImpl.prototype.scrollViewWillBeginZoomingWithView = function (scrollView, view) {
        this._handleDisableZoom(scrollView);
    };
    UIScrollViewDelegateImpl.prototype.scrollViewDidZoom = function (scrollView) {
        this._handleDisableZoom(scrollView);
    };
    var UIScrollViewDelegateImpl_1;
    UIScrollViewDelegateImpl = UIScrollViewDelegateImpl_1 = __decorate([
        ObjCClass(UIScrollViewDelegate)
    ], UIScrollViewDelegateImpl);
    return UIScrollViewDelegateImpl;
}(NSObject));
export class WebView extends WebViewBase {
    createNativeView() {
        const jScript = "var meta = document.createElement('meta'); meta.setAttribute('name', 'viewport'); meta.setAttribute('content', 'initial-scale=1.0'); document.getElementsByTagName('head')[0].appendChild(meta);";
        const wkUScript = WKUserScript.alloc().initWithSourceInjectionTimeForMainFrameOnly(jScript, 1 /* AtDocumentEnd */, true);
        const wkUController = WKUserContentController.new();
        wkUController.addUserScript(wkUScript);
        const configuration = WKWebViewConfiguration.new();
        configuration.userContentController = wkUController;
        configuration.preferences.setValueForKey(true, 'allowFileAccessFromFileURLs');
        return new WKWebView({
            frame: CGRectZero,
            configuration: configuration,
        });
    }
    initNativeView() {
        super.initNativeView();
        this._delegate = WKNavigationDelegateImpl.initWithOwner(new WeakRef(this));
        this._scrollDelegate = UIScrollViewDelegateImpl.initWithOwner(new WeakRef(this));
        this._uiDelegate = WKUIDelegateImpl.initWithOwner(new WeakRef(this));
        this.ios.navigationDelegate = this._delegate;
        this.ios.scrollView.delegate = this._scrollDelegate;
        this.ios.UIDelegate = this._uiDelegate;
    }
    onLoaded() {
        super.onLoaded();
    }
    onUnloaded() {
        super.onUnloaded();
    }
    // @ts-ignore
    get ios() {
        return this.nativeViewProtected;
    }
    stopLoading() {
        this.ios.stopLoading();
    }
    _loadUrl(src) {
        if (src.startsWith('file:///')) {
            const cachePath = src.substring(0, src.lastIndexOf('/'));
            this.ios.loadFileURLAllowingReadAccessToURL(NSURL.URLWithString(src), NSURL.URLWithString(cachePath));
        }
        else {
            this.ios.loadRequest(NSURLRequest.requestWithURL(NSURL.URLWithString(src)));
        }
    }
    _loadData(content) {
        this.ios.loadHTMLStringBaseURL(content, NSURL.alloc().initWithString(`file:///${knownFolders.currentApp().path}/`));
    }
    get canGoBack() {
        return this.ios.canGoBack;
    }
    get canGoForward() {
        return this.ios.canGoForward;
    }
    goBack() {
        this.ios.goBack();
    }
    goForward() {
        this.ios.goForward();
    }
    reload() {
        this.ios.reload();
    }
    [disableZoomProperty.setNative](value) {
        if (!value && typeof this._minimumZoomScale === 'number' && typeof this._maximumZoomScale === 'number' && typeof this._zoomScale === 'number') {
            if (this.ios.scrollView) {
                this.ios.scrollView.minimumZoomScale = this._minimumZoomScale;
                this.ios.scrollView.maximumZoomScale = this._maximumZoomScale;
                this.ios.scrollView.zoomScale = this._zoomScale;
                this._minimumZoomScale = undefined;
                this._maximumZoomScale = undefined;
                this._zoomScale = undefined;
            }
        }
    }
}
__decorate([
    profile,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WebView.prototype, "onLoaded", null);
//# sourceMappingURL=index.ios.js.map