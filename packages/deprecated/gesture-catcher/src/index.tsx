import * as GestureCatcher from './GestureCatcher';
import * as GestureObservable from '@hzdg/gesture-observable';
import * as keyboard from './useKeyboardGesture';
import * as mouse from './useMouseGesture';
import * as touch from './useTouchGesture';
import * as wheel from './useWheelGesture';
import * as gesture from './useGesture';

export type GestureCatcherRenderProps<
  T extends HTMLElement
> = GestureCatcher.GestureCatcherRenderProps<T>;
export type GestureCatcherProps<
  T extends HTMLElement
> = GestureCatcher.GestureCatcherProps<T>;

export type KeyboardGestureConfig = keyboard.KeyboardGestureConfig;
export type KeyboardGestureChangeHandler = keyboard.KeyboardGestureChangeHandler;
export type KeyboardGestureHandler = keyboard.KeyboardGestureHandler;
export type KeyboardGestureHandlers = keyboard.KeyboardGestureHandlers;
export type KeyboardGestureState = keyboard.KeyboardGestureState;
export type KeyboardGestureEndState = keyboard.KeyboardGestureEndState;
export type KeyboardGestureEventSourceState = keyboard.KeyboardGestureEventSourceState;

export type MouseGestureConfig = mouse.MouseGestureConfig;
export type MouseGestureChangeHandler = mouse.MouseGestureChangeHandler;
export type MouseGestureHandler = mouse.MouseGestureHandler;
export type MouseGestureHandlers = mouse.MouseGestureHandlers;
export type MouseGestureState = mouse.MouseGestureState;
export type MouseGestureEndState = mouse.MouseGestureEndState;
export type MouseGestureEventSourceState = mouse.MouseGestureEventSourceState;

export type TouchGestureConfig = touch.TouchGestureConfig;
export type TouchGestureChangeHandler = touch.TouchGestureChangeHandler;
export type TouchGestureHandler = touch.TouchGestureHandler;
export type TouchGestureHandlers = touch.TouchGestureHandlers;
export type TouchGestureState = touch.TouchGestureState;
export type TouchGestureEndState = touch.TouchGestureEndState;
export type TouchGestureEventSourceState = touch.TouchGestureEventSourceState;

export type WheelGestureConfig = wheel.WheelGestureConfig;
export type WheelGestureChangeHandler = wheel.WheelGestureChangeHandler;
export type WheelGestureHandler = wheel.WheelGestureHandler;
export type WheelGestureHandlers = wheel.WheelGestureHandlers;
export type WheelGestureState = wheel.WheelGestureState;
export type WheelGestureEndState = wheel.WheelGestureEndState;
export type WheelGestureEventSourceState = wheel.WheelGestureEventSourceState;

export type GestureConfig = gesture.GestureConfig;
export type GestureChangeHandler = gesture.GestureChangeHandler;
export type GestureHandler = gesture.GestureHandler;
export type GestureHandlers = gesture.GestureHandlers;
export type GestureState = gesture.GestureState;
export type GestureEndState = gesture.GestureEndState;
export type GestureEventSourceState = gesture.GestureEventSourceState;

export const useKeyboardGesture = keyboard.default;
export const useMouseGesture = mouse.default;
export const useTouchGesture = touch.default;
export const useWheelGesture = wheel.default;
export const useGesture = gesture.default;

export const Orientation = GestureObservable.Orientation;

export const useConfigFor = GestureCatcher.useConfigFor;
export default GestureCatcher.default;
