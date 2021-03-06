import * as types from '../../utils/types';
import * as domainDebugger from '../../debugger';
import { getFilenameFromUrl } from './http-request-common';
export var HttpResponseEncoding;
(function (HttpResponseEncoding) {
    HttpResponseEncoding[HttpResponseEncoding["UTF8"] = 0] = "UTF8";
    HttpResponseEncoding[HttpResponseEncoding["GBK"] = 1] = "GBK";
})(HttpResponseEncoding || (HttpResponseEncoding = {}));
const currentDevice = UIDevice.currentDevice;
const device = currentDevice.userInterfaceIdiom === 0 /* Phone */ ? 'Phone' : 'Pad';
const osVersion = currentDevice.systemVersion;
const GET = 'GET';
const USER_AGENT_HEADER = 'User-Agent';
const USER_AGENT = `Mozilla/5.0 (i${device}; CPU OS ${osVersion.replace('.', '_')} like Mac OS X) AppleWebKit/536.26 (KHTML, like Gecko) Version/${osVersion} Mobile/10A5355d Safari/8536.25`;
const sessionConfig = NSURLSessionConfiguration.defaultSessionConfiguration;
const queue = NSOperationQueue.mainQueue;
function parseJSON(source) {
    const src = source.trim();
    if (src.lastIndexOf(')') === src.length - 1) {
        return JSON.parse(src.substring(src.indexOf('(') + 1, src.lastIndexOf(')')));
    }
    return JSON.parse(src);
}
var NSURLSessionTaskDelegateImpl = /** @class */ (function (_super) {
    __extends(NSURLSessionTaskDelegateImpl, _super);
    function NSURLSessionTaskDelegateImpl() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    NSURLSessionTaskDelegateImpl.prototype.URLSessionTaskWillPerformHTTPRedirectionNewRequestCompletionHandler = function (session, task, response, request, completionHandler) {
        completionHandler(null);
    };
    NSURLSessionTaskDelegateImpl.ObjCProtocols = [NSURLSessionTaskDelegate];
    return NSURLSessionTaskDelegateImpl;
}(NSObject));
const sessionTaskDelegateInstance = NSURLSessionTaskDelegateImpl.new();
let defaultSession;
function ensureDefaultSession() {
    if (!defaultSession) {
        defaultSession = NSURLSession.sessionWithConfigurationDelegateDelegateQueue(sessionConfig, null, queue);
    }
}
let sessionNotFollowingRedirects;
function ensureSessionNotFollowingRedirects() {
    if (!sessionNotFollowingRedirects) {
        sessionNotFollowingRedirects = NSURLSession.sessionWithConfigurationDelegateDelegateQueue(sessionConfig, sessionTaskDelegateInstance, queue);
    }
}
let imageSource;
function ensureImageSource() {
    if (!imageSource) {
        imageSource = require('../../image-source');
    }
}
let fs;
function ensureFileSystem() {
    if (!fs) {
        fs = require('../../file-system');
    }
}
export function request(options) {
    return new Promise((resolve, reject) => {
        if (!options.url) {
            reject(new Error('Request url was empty.'));
            return;
        }
        try {
            const network = domainDebugger.getNetwork();
            const debugRequest = network && network.create();
            const urlRequest = NSMutableURLRequest.requestWithURL(NSURL.URLWithString(options.url));
            urlRequest.HTTPMethod = types.isDefined(options.method) ? options.method : GET;
            urlRequest.setValueForHTTPHeaderField(USER_AGENT, USER_AGENT_HEADER);
            if (options.headers) {
                for (const header in options.headers) {
                    urlRequest.setValueForHTTPHeaderField(options.headers[header] + '', header);
                }
            }
            if (types.isString(options.content) || options.content instanceof FormData) {
                urlRequest.HTTPBody = NSString.stringWithString(options.content.toString()).dataUsingEncoding(4);
            }
            else if (options.content instanceof ArrayBuffer) {
                const buffer = options.content;
                urlRequest.HTTPBody = NSData.dataWithData(buffer);
            }
            if (types.isNumber(options.timeout)) {
                urlRequest.timeoutInterval = options.timeout / 1000;
            }
            let session;
            if (types.isBoolean(options.dontFollowRedirects) && options.dontFollowRedirects) {
                ensureSessionNotFollowingRedirects();
                session = sessionNotFollowingRedirects;
            }
            else {
                ensureDefaultSession();
                session = defaultSession;
            }
            const dataTask = session.dataTaskWithRequestCompletionHandler(urlRequest, function (data, response, error) {
                if (error) {
                    reject(new Error(error.localizedDescription));
                }
                else {
                    const headers = {};
                    if (response && response.allHeaderFields) {
                        const headerFields = response.allHeaderFields;
                        headerFields.enumerateKeysAndObjectsUsingBlock((key, value, stop) => {
                            addHeader(headers, key, value);
                        });
                    }
                    if (debugRequest) {
                        debugRequest.mimeType = response.MIMEType;
                        debugRequest.data = data;
                        const debugResponse = {
                            url: options.url,
                            status: response.statusCode,
                            statusText: NSHTTPURLResponse.localizedStringForStatusCode(response.statusCode),
                            headers: headers,
                            mimeType: response.MIMEType,
                            fromDiskCache: false,
                        };
                        debugRequest.responseReceived(debugResponse);
                        debugRequest.loadingFinished();
                    }
                    resolve({
                        content: {
                            raw: data,
                            toArrayBuffer: () => interop.bufferFromData(data),
                            toString: (encoding) => {
                                const str = NSDataToString(data, encoding);
                                if (typeof str === 'string') {
                                    return str;
                                }
                                else {
                                    throw new Error('Response content may not be converted to string');
                                }
                            },
                            toJSON: (encoding) => parseJSON(NSDataToString(data, encoding)),
                            toImage: () => {
                                ensureImageSource();
                                return new Promise((resolve, reject) => {
                                    UIImage.tns_decodeImageWithDataCompletion(data, (image) => {
                                        if (image) {
                                            resolve(new imageSource.ImageSource(image));
                                        }
                                        else {
                                            reject(new Error('Response content may not be converted to an Image'));
                                        }
                                    });
                                });
                            },
                            toFile: (destinationFilePath) => {
                                ensureFileSystem();
                                if (!destinationFilePath) {
                                    destinationFilePath = getFilenameFromUrl(options.url);
                                }
                                if (data instanceof NSData) {
                                    // ensure destination path exists by creating any missing parent directories
                                    const file = fs.File.fromPath(destinationFilePath);
                                    data.writeToFileAtomically(destinationFilePath, true);
                                    return file;
                                }
                                else {
                                    reject(new Error(`Cannot save file with path: ${destinationFilePath}.`));
                                }
                            },
                        },
                        statusCode: response.statusCode,
                        headers: headers,
                    });
                }
            });
            if (options.url && debugRequest) {
                const request = {
                    url: options.url,
                    method: 'GET',
                    headers: options.headers,
                };
                debugRequest.requestWillBeSent(request);
            }
            dataTask.resume();
        }
        catch (ex) {
            reject(ex);
        }
    });
}
function NSDataToString(data, encoding) {
    let code = NSUTF8StringEncoding; // long:4
    if (encoding === HttpResponseEncoding.GBK) {
        code = 1586 /* kCFStringEncodingGB_18030_2000 */; // long:1586
    }
    let encodedString = NSString.alloc().initWithDataEncoding(data, code);
    // If UTF8 string encoding fails try with ISO-8859-1
    if (!encodedString) {
        code = NSISOLatin1StringEncoding; // long:5
        encodedString = NSString.alloc().initWithDataEncoding(data, code);
    }
    return encodedString.toString();
}
export function addHeader(headers, key, value) {
    if (!headers[key]) {
        headers[key] = value;
    }
    else if (Array.isArray(headers[key])) {
        headers[key].push(value);
    }
    else {
        const values = [headers[key]];
        values.push(value);
        headers[key] = values;
    }
}
//# sourceMappingURL=index.ios.js.map