const keyboard = document.querySelector('.keyboard');
const rotation = { x: 20, y: 0 };
let animating = [];
let animatingColor;
const keysDown = new Set();
const keyCodeToEle = new Map();
const allKeys = [...document.querySelectorAll('.key')];
/* It's looping through all the keys, and if the key has a data-code attribute, it's adding
the key to the keyCodeToEle map. */
allKeys.forEach(ele => {
    ele.dataset.code && keyCodeToEle.set(ele.dataset.code, ele);
});
const capsLockKeyIndex = allKeys.indexOf(keyCodeToEle.get('CapsLock'));
/* It's selecting all the keys that have a data-macro attribute, and adding them to the macroKeys
array. */
const macroKeys = [document.querySelector('[data-code="Escape"]'), ...document.querySelectorAll('[data-macro]')];
const furthestKeys = {};
requestAnimationFrame(() => {
    const allKeyBounds = allKeys.map(n => n.getBoundingClientRect());
    /* It's calculating the distance between each key and each macro key. */
    for (const macro of macroKeys) {
        const index = allKeys.indexOf(macro);
        const color = macro.dataset.macro;
        furthestKeys[color] = 0;
        const macroBounds = allKeyBounds[index];
        for (let i = 0; i < allKeys.length; i++) {
            const ele = allKeys[i];
            if (macro === ele) continue;
            const eleBounds = allKeyBounds[i];
            const d = dist(
                macroBounds.x + macroBounds.width * 0.5, macroBounds.y + macroBounds.height * 0.5,
                eleBounds.x + eleBounds.width * 0.5, eleBounds.y + eleBounds.height * 0.5);
            ele.macro = ele.macro || {};
            ele.macro[color] = d;
            if (d > furthestKeys[color]) {
                furthestKeys[color] = d;
            }
        }
    }
});
function animateMacro(ele) {
    const { macro } = ele.dataset;
    const [color, id] = macro.split(':');
    /* It's preventing the spacebar and shift keys from animating when caps lock is off. */
    if (!keysDown.has(capsLockKeyIndex)) {
        if (['Space', 'ShiftLeft'].includes(id)) {
            return;
        }
    }
    animating.push({ time: performance.now(), macro, color });
    if (animating.length === 1) {
        _draw();
    }
}
macroKeys.forEach(ele => {
    ele.addEventListener('click', () => animateMacro(ele));
});
/* It's setting the state of the key to true or false. */
function setKeyState(code, state) {
    const ele = keyCodeToEle.get(code);
    
    if (ele) {
        if (state) {
            keysDown.add(allKeys.indexOf(ele));
            ele.dataset.selected = 'true';
        } else {
            ele.dataset.selected = 'false';
            keysDown.delete(allKeys.indexOf(ele));
            if (macroKeys.includes(ele)) {
                animateMacro(ele);
            }
        }
    }
}
/* It's preventing the function keys from being pressed. */
window.addEventListener('keydown', e => {
    if (e.code.startsWith('F') && !isNaN(e.code.slice(1))) {
        return;
    }
    e.preventDefault();
    setKeyState('CapsLock', e.getModifierState('CapsLock'));
    if (e.code === 'CapsLock') {
        return;
    }
    setKeyState(e.code, true);
});
window.addEventListener('keyup', e => {
    e.preventDefault();
    setKeyState('CapsLock', e.getModifierState('CapsLock'));
    if (e.code === 'CapsLock') {
        return;
    }
    setKeyState(e.code, false);
});
/* It's resetting the keyboard when the window loses focus. */
window.addEventListener('blur', e => {
    if (animating.length) animating.splice(0);
    for (const ele of document.querySelectorAll('[data-selected="true"], [data-color]')) {
        const index = allKeys.indexOf(ele);
        if (index !== capsLockKeyIndex) {
            ele.dataset.selected = 'false';
            ele.dataset.color = '';
            keysDown.delete(index);
        }
    }
});

/**
 * Returns the distance between two points.
 * @param x1 - The x coordinate of the first point.
 * @param y1 - The y coordinate of the first point.
 * @param x2 - The x coordinate of the second point.
 * @param y2 - The y coordinate of the second point.
 * @returns The distance between two points.
 */
function distSq(x1, y1, x2, y2) {
    const _x = x2 - x1, _y = y2 - y1;
    return _x * _x + _y * _y;
}
function dist(x1, y1, x2, y2) {
    const d = distSq(x1, y1, x2, y2);
    if (d === 0) return 0;
    return Math.sqrt(d);
}

/**
 * It draws the canvas, then if there are any elements that are animating, it requests another
 * animation frame, otherwise it resets the selected and color attributes of all elements.
 * @param e - The event object.
 */
function _draw(e) {
    draw(e);
    if (animating.length) {
        requestAnimationFrame(_draw);
    } else {
        for (const ele of document.querySelectorAll('[data-selected="true"], [data-color]')) {
            ele.dataset.selected = 'false';
            ele.dataset.color = '';
        }
    }
}

/**
 * For each key, if it's in the macro, and the time is within 100ms of the macro's time, then set the
 * key to the color of the macro
 * @param e - the current time
 * @returns A function that takes an event as an argument.
 */
function draw(e) {
    if (!animating.length) return;
    const actions = Array(allKeys.length).fill(false);
    keysDown.forEach(i => actions[i] = true);
    const dilation = 100;
    /* It's looping through the animating array, and for each element, it's calculating the time
    since the animation started, and if the time is greater than the duration of the animation, it's
    removing the element from the array. If the time is less than the duration, it's looping through
    each key, and if the time is within 100ms of the distance between the key and the macro key,
    it's
    setting the color of the key to the color of the macro key. */
    for (let i = animating.length - 1; i >= 0; i--) {
        const a = animating[i];
        const time = e - a.time;
        const duration = furthestKeys[a.macro] + dilation;
        if (time >= duration) {
            animating.splice(i, 1);
            return;
        }
        for (let keyIndex = 0; keyIndex < allKeys.length; keyIndex++) {
            const key = allKeys[keyIndex];
            const d = key.macro[a.macro];
            const t = Math.abs(time - d);
            if (t < dilation && !actions[keyIndex]) {
                actions[keyIndex] = a.color;
            }
        }
    }
    /* It's looping through the actions array, and if the action is a string, it's setting the
    color of the key to the color of the action, otherwise it's setting the selected attribute of
    the
    key to true. */
    for (let i = 0; i < actions.length; i++) {
        const key = allKeys[i];
        if (actions[i]) {
            key.dataset.selected = 'true';
            if (typeof actions[i] === 'string') {
                key.dataset.color = actions[i];
            }
        } else {
            key.dataset.color = '';
            key.dataset.selected = 'false';
        }
    }
}