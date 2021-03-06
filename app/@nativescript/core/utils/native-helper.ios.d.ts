export declare namespace iOSNativeHelper {
    function getter<T>(_this: any, property: T | {
        (): T;
    }): T;
    namespace collections {
        function jsArrayToNSArray<T>(str: T[]): NSArray<T>;
        function nsArrayToJSArray<T>(a: NSArray<T>): Array<T>;
    }
    function isLandscape(): boolean;
    const MajorVersion: number;
    function openFile(filePath: string): boolean;
    function getCurrentAppPath(): string;
    function joinPaths(...paths: string[]): string;
    function getVisibleViewController(rootViewController: UIViewController): UIViewController;
    function applyRotateTransform(transform: CATransform3D, x: number, y: number, z: number): CATransform3D;
    function getShadowLayer(nativeView: UIView, name?: string, create?: boolean): CALayer;
    function createUIDocumentInteractionControllerDelegate(): NSObject;
    function isRealDevice(): true | NSArray<string>;
}
