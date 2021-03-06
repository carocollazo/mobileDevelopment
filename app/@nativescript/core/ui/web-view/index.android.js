import { disableZoomProperty, WebViewBase } from './web-view-common';
import { Trace } from '../../trace';
import { knownFolders } from '../../file-system';
export * from './web-view-common';
let WebViewClient;
function initializeWebViewClient() {
    if (WebViewClient) {
        return;
    }
    var WebViewClientImpl = /** @class */ (function (_super) {
    __extends(WebViewClientImpl, _super);
    function WebViewClientImpl(owner) {
        var _this = _super.call(this) || this;
        _this.owner = owner;
        return global.__native(_this);
    }
    WebViewClientImpl.prototype.shouldOverrideUrlLoading = function (view, url) {
        if (Trace.isEnabled()) {
            Trace.write('WebViewClientClass.shouldOverrideUrlLoading(' + url + ')', Trace.categories.Debug);
        }
        return false;
    };
    WebViewClientImpl.prototype.onPageStarted = function (view, url, favicon) {
        _super.prototype.onPageStarted.call(this, view, url, favicon);
        var owner = this.owner;
        if (owner) {
            if (Trace.isEnabled()) {
                Trace.write('WebViewClientClass.onPageStarted(' + url + ', ' + favicon + ')', Trace.categories.Debug);
            }
            owner._onLoadStarted(url, undefined);
        }
    };
    WebViewClientImpl.prototype.onPageFinished = function (view, url) {
        _super.prototype.onPageFinished.call(this, view, url);
        var owner = this.owner;
        if (owner) {
            if (Trace.isEnabled()) {
                Trace.write('WebViewClientClass.onPageFinished(' + url + ')', Trace.categories.Debug);
            }
            owner._onLoadFinished(url, undefined);
        }
    };
    WebViewClientImpl.prototype.onReceivedError = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var view = args[0];
        if (arguments.length === 4) {
            var errorCode = args[1];
            var description = args[2];
            var failingUrl = args[3];
            _super.prototype.onReceivedError.call(this, view, errorCode, description, failingUrl);
            var owner = this.owner;
            if (owner) {
                if (Trace.isEnabled()) {
                    Trace.write('WebViewClientClass.onReceivedError(' + errorCode + ', ' + description + ', ' + failingUrl + ')', Trace.categories.Debug);
                }
                owner._onLoadFinished(failingUrl, description + '(' + errorCode + ')');
            }
        }
        else {
            var request = args[1];
            var error = args[2];
            // before API version 23 there's no onReceiveError with 3 parameters, so it shouldn't come here
            // but we don't have the onReceivedError with 3 parameters there and that's why we are ignorint tye typescript error
            // @ts-ignore TS2554
            _super.prototype.onReceivedError.call(this, view, request, error);
            var owner = this.owner;
            if (owner) {
                if (Trace.isEnabled()) {
                    Trace.write('WebViewClientClass.onReceivedError(' + error.getErrorCode() + ', ' + error.getDescription() + ', ' + (error.getUrl && error.getUrl()) + ')', Trace.categories.Debug);
                }
                owner._onLoadFinished(error.getUrl && error.getUrl(), error.getDescription() + '(' + error.getErrorCode() + ')');
            }
        }
    };
    return WebViewClientImpl;
}(android.webkit.WebViewClient));
    WebViewClient = WebViewClientImpl;
}
export class WebView extends WebViewBase {
    createNativeView() {
        const nativeView = new android.webkit.WebView(this._context);
        nativeView.getSettings().setJavaScriptEnabled(true);
        nativeView.getSettings().setBuiltInZoomControls(true);
        return nativeView;
    }
    initNativeView() {
        super.initNativeView();
        initializeWebViewClient();
        const nativeView = this.nativeViewProtected;
        const client = new WebViewClient(this);
        nativeView.setWebViewClient(client);
        nativeView.client = client;
        this._disableZoom(this.disableZoom);
    }
    disposeNativeView() {
        const nativeView = this.nativeViewProtected;
        if (nativeView) {
            nativeView.destroy();
        }
        nativeView.client.owner = null;
        super.disposeNativeView();
    }
    _disableZoom(value) {
        if (this.nativeView && value) {
            const settings = this.nativeView.getSettings();
            settings.setBuiltInZoomControls(false);
            settings.setSupportZoom(false);
            settings.setDisplayZoomControls(false);
        }
    }
    [disableZoomProperty.setNative](value) {
        this._disableZoom(value);
    }
    _loadUrl(src) {
        const nativeView = this.nativeViewProtected;
        if (!nativeView) {
            return;
        }
        nativeView.loadUrl(src);
    }
    _loadData(src) {
        const nativeView = this.nativeViewProtected;
        if (!nativeView) {
            return;
        }
        const baseUrl = `file:///${knownFolders.currentApp().path}/`;
        nativeView.loadDataWithBaseURL(baseUrl, src, 'text/html', 'utf-8', null);
    }
    get canGoBack() {
        return this.nativeViewProtected.canGoBack();
    }
    stopLoading() {
        const nativeView = this.nativeViewProtected;
        if (nativeView) {
            nativeView.stopLoading();
        }
    }
    get canGoForward() {
        const nativeView = this.nativeViewProtected;
        if (nativeView) {
            return nativeView.canGoForward();
        }
        return false;
    }
    goBack() {
        const nativeView = this.nativeViewProtected;
        if (nativeView) {
            return nativeView.goBack();
        }
    }
    goForward() {
        const nativeView = this.nativeViewProtected;
        if (nativeView) {
            return nativeView.goForward();
        }
    }
    reload() {
        const nativeView = this.nativeViewProtected;
        if (nativeView) {
            return nativeView.reload();
        }
    }
}
//# sourceMappingURL=index.android.js.map