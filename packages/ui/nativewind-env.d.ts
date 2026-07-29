/**
 * Teaches TypeScript that React Native components accept `className`.
 *
 * The native builds in this package are styled with NativeWind, so without
 * this every `className` prop is a type error here — even though the app that
 * consumes them typechecks fine, because it has its own copy of this
 * reference.
 */
/// <reference types="nativewind/types" />
