// Game-only gesture policy. Pointer Events still drive movement and casting.
// Preserve native clicks for links, pause, resume and restart buttons.
const nonPassive = { passive: false };
const prevent = (event) => {
  if (event.cancelable) event.preventDefault();
};
for (const type of [
  "gesturestart",
  "gesturechange",
  "gestureend",
  "dblclick",
]) {
  document.addEventListener(type, prevent, nonPassive);
}
document.addEventListener("touchmove", prevent, nonPassive);
document.addEventListener(
  "touchstart",
  (event) => {
    if (event.touches.length > 1) prevent(event);
  },
  nonPassive,
);
document.addEventListener(
  "touchend",
  (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const pointerControl = target?.closest("#skills, #attack, #stick, canvas");
    const nativeControl = target?.closest("button, a");
    if (pointerControl || !nativeControl) prevent(event);
  },
  nonPassive,
);
