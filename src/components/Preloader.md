# Preloader Component Documentation

## Overview

The `Preloader` component creates an animated loading screen that covers the entire page until the user clicks the "ENTER" button. It features a multi-stage animation sequence with SVG graphics and smooth transitions.

## Component Structure

### State Management

The component uses multiple React state hooks to control different aspects of the animation:

- **`firstPreloaderVisible`**: Controls the visibility of the first preloader SVG animation
- **`secondPreloaderVisible`**: Controls the visibility of the second preloader SVG animation
- **`gElementsVisible`**: Array of booleans tracking which SVG `<g>` elements should be visible
- **`gElementsBlinking`**: Array of booleans tracking which SVG `<g>` elements should blink
- **`enterButtonVisible`**: Controls the visibility of the "ENTER" button
- **`isRevealing`**: Triggers the reveal animation (both top and bottom layers animate when true)
- **`preloaderHidden`**: Controls whether the entire preloader container is hidden

### Refs

- **`secondPreloaderRef`**: Reference to the container div of the second preloader SVG
- **`gElementsRef`**: Reference to the NodeList of all `<g>` elements within the second preloader
- **`isProcessingClick`**: Ref to prevent multiple simultaneous button clicks

## Animation Sequence

The component follows a specific animation sequence that runs automatically when the component mounts:

### Step 1: First Preloader Fades In

- Waits 500ms
- Sets `firstPreloaderVisible` to `true`
- The first preloader SVG fades in with opacity transition

### Step 2: Second Preloader Appears

- Waits 1000ms after first preloader appears
- Sets `secondPreloaderVisible` to `true`
- The second preloader SVG fades in

### Step 3: SVG `<g>` Elements Animation

After the second preloader is visible, the component:

1. **Waits 100ms** for the DOM refs to be ready

2. **Fills from Left to Right**:
   - Queries all `<g>` elements with `display: block` style
   - Extracts X-coordinates from their `transform` matrix attributes
   - Sorts elements by X position (left to right)
   - Animates each element to `opacity: 1` sequentially with 100ms delay between each

3. **All Elements Fade Out**:
   - Waits 500ms
   - Sets all elements to `opacity: 0`

4. **Elements Appear Two by Two**:
   - Waits 300ms
   - Animates elements to `opacity: 1` in pairs (two at a time) with 150ms delay between pairs

5. **Blinking Effect**:
   - Waits 500ms
   - Starts an interval that randomly toggles each visible element's opacity between 1 and 0.5 every 200ms
   - This creates a blinking/strobing effect

6. **Hide Preloaders and Show Button**:
   - After 2000ms of blinking
   - Clears the blinking interval
   - Hides all `<g>` elements
   - Hides both first and second preloader SVGs
   - Waits 300ms
   - Shows the "ENTER" button

## User Interaction

### Enter Button Click Handler

When the user clicks the "ENTER" button:

1. **Prevents Multiple Clicks**: Uses `isProcessingClick` ref to prevent multiple simultaneous button clicks

2. **Button Blinks Twice**:
   - Sets button opacity to 0
   - Waits 100ms
   - Sets button opacity to 1
   - Waits 100ms
   - Repeats once more (total of 2 blinks)
   - After blinking, button is hidden (`enterButtonVisible` set to `false`)

3. **Delay Before Reveal**:
   - Waits 300ms after button disappears

4. **Reveal Animation**:
   - Sets `isRevealing` to `true` → Both layers animate simultaneously
     - Top layer slides up (`-translate-y-full`)
     - Bottom layer slides down (`translate-y-full`)
   - Both animations use CSS transitions with 1000ms duration

5. **Hide Preloader**:
   - After 1000ms (when reveal animation completes)
   - Sets `preloaderHidden` to `true`
   - This hides the entire preloader container and removes pointer events

## JSX Structure

### Main Container

```tsx
<div className="preloader-container fixed inset-0 z-[9999]">
```

- Fixed position covering entire viewport
- Highest z-index (9999) to appear above all content

### Top and Bottom Image Layers

Two divs that split the screen:

- **Top Layer**: 50% height, positioned at top, slides up when revealed
- **Bottom Layer**: 50% height, positioned at bottom, slides down when revealed
- Both use CSS transitions for smooth animation
- Currently have empty background images (placeholders for actual images)

### Overlay Container

Contains the preloader animations and button:

- Centered on screen
- Pointer events disabled on container (enabled only on button)

### First Preloader SVG

- Simple line-based SVG animation
- Fades in/out based on `firstPreloaderVisible` state
- Uses opacity and visibility transitions

### Second Preloader SVG

- Contains multiple `<g>` elements with text/graphics
- Each `<g>` element has:
  - `data-g-index` attribute for tracking
  - Dynamic `opacity` based on `gElementsVisible` and `gElementsBlinking` arrays
  - Complex nested structure with paths for text rendering

### Enter Button

- Positioned absolutely at center (49.4% top, 49.3% left)
- Only visible when `enterButtonVisible` is true
- Only clickable when visible (pointer events controlled)
- Uses opacity transition for smooth appearance

## Key Features

1. **Sequential Animation**: Each stage waits for the previous one to complete
2. **Spatial Sorting**: SVG elements are sorted by X position for left-to-right animation
3. **Random Blinking**: Creates a dynamic, eye-catching effect
4. **User-Controlled Reveal**: Page content is only revealed after user interaction
5. **Smooth Transitions**: All animations use CSS transitions for smooth effects
6. **Fallback Handling**: If SVG elements aren't found, shows button after 3 seconds

## CSS Classes Used

- **Tailwind Classes**:
  - `fixed inset-0`: Full viewport coverage
  - `z-[9999]`: Maximum z-index
  - `absolute top-0/bottom-0`: Positioning for layers
  - `h-1/2 w-full`: 50% height, full width
  - `transition-transform duration-1000 ease-in-out`: Smooth transform animations
  - `-translate-y-full`: Slide up (top layer)
  - `translate-y-full`: Slide down (bottom layer)
  - `pointer-events-none/auto`: Control interactivity

## Timing Summary

- Initial delay: 500ms
- First preloader delay: 1000ms
- Ref ready wait: 100ms
- Element fill delay: 100ms per element
- Fade out wait: 500ms
- Pair animation delay: 300ms + 150ms per pair
- Blinking duration: 2000ms
- Button appearance delay: 300ms
- Button blink: 100ms on/off (x2)
- Delay before reveal: 300ms
- Reveal animation: 1000ms
- Total minimum time before button appears: ~4-5 seconds (depending on number of elements)

## Customization Points

1. **Image URLs**: Replace empty strings in `backgroundImage` styles (lines 165, 178)
2. **Timing**: Adjust setTimeout delays throughout the code
3. **Blinking Duration**: Change the 2000ms timeout in the blinking section
4. **Animation Speed**: Modify CSS transition durations
5. **Element Animation**: Change from "two by two" to "one by one" by modifying the loop increment
