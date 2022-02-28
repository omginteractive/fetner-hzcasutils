// See https://github.com/testing-library/jest-dom#usage
import '@testing-library/jest-dom/extend-expect';

// Globally mock rAF so that it can be advanced using jest's fake timers.
// See https://github.com/facebook/jest/issues/5147
global.requestAnimationFrame = fn => setTimeout(fn, 16);
global.cancelAnimationFrame = id => clearTimeout(id);
