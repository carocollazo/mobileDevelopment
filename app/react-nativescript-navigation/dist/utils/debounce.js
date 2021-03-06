export default function debounce(func, duration) {
    let timeout;
    return function (...args) {
        if (!timeout) {
            // eslint-disable-next-line babel/no-invalid-this
            func.apply(this, args);
            timeout = setTimeout(() => {
                timeout = undefined;
            }, duration);
        }
    };
}
//# sourceMappingURL=debounce.js.map