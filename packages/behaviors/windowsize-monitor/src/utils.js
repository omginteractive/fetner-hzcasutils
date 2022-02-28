export function throttle(func, threshold = 250, scope) {
  let last, deferTimer;
  return function(ctx) {
    let context = scope || ctx;
    let now = Date.now(),
      args = arguments;
    if (last && now < last + threshold) {
      clearTimeout(deferTimer);
      deferTimer = setTimeout(function() {
        last = now;
        func.apply(context, args);
      }, threshold);
    } else {
      last = now;
      func.apply(context, args);
    }
  };
}
