<script setup lang="ts">
import type { CSSProperties } from 'vue'

type Croissant = {
  id: number
  /** Horizontal start position, as a percentage of the viewport width. */
  left: string
  /** Rendered size in px. */
  size: number
  /** Seconds for one full bottom-to-top pass. */
  duration: number
  /** Negative, so the screen is already populated on the first frame. */
  delay: number
  /** Sideways drift over the pass. */
  driftX: string
  rotateFrom: string
  rotateTo: string
  /** Multiplier applied to --croissant-ink-opacity. */
  opacity: number
  /** Dropped on small screens to keep the paint cost down. */
  small?: boolean
}

// Deterministic rather than random: the composition is reviewable, and it stays
// identical between reloads.
const croissants: Croissant[] = [
  { id: 1, left: '4%', size: 96, duration: 52, delay: -6, driftX: '5vw', rotateFrom: '-20deg', rotateTo: '18deg', opacity: 1 },
  { id: 2, left: '17%', size: 148, duration: 74, delay: -41, driftX: '-6vw', rotateFrom: '14deg', rotateTo: '-22deg', opacity: 0.65 },
  { id: 3, left: '29%', size: 64, duration: 44, delay: -22, driftX: '4vw', rotateFrom: '-8deg', rotateTo: '34deg', opacity: 0.85, small: true },
  { id: 4, left: '41%', size: 118, duration: 63, delay: -55, driftX: '-3vw', rotateFrom: '26deg', rotateTo: '-10deg', opacity: 0.75 },
  { id: 5, left: '54%', size: 78, duration: 48, delay: -14, driftX: '6vw', rotateFrom: '-30deg', rotateTo: '6deg', opacity: 0.9, small: true },
  { id: 6, left: '66%', size: 160, duration: 80, delay: -33, driftX: '-7vw', rotateFrom: '8deg', rotateTo: '-26deg', opacity: 0.6 },
  { id: 7, left: '78%', size: 88, duration: 56, delay: -49, driftX: '3vw', rotateFrom: '-14deg', rotateTo: '24deg', opacity: 0.95 },
  { id: 8, left: '88%', size: 124, duration: 68, delay: -9, driftX: '-5vw', rotateFrom: '20deg', rotateTo: '-14deg', opacity: 0.7, small: true },
  { id: 9, left: '95%', size: 70, duration: 46, delay: -29, driftX: '-4vw', rotateFrom: '-24deg', rotateTo: '12deg', opacity: 0.8, small: true }
]

const styleFor = (c: Croissant): CSSProperties => ({
  left: c.left,
  width: `${c.size}px`,
  height: `${c.size}px`,
  animationDuration: `${c.duration}s`,
  animationDelay: `${c.delay}s`,
  '--drift-x': c.driftX,
  '--drift-rot-from': c.rotateFrom,
  '--drift-rot-to': c.rotateTo,
  '--drift-opacity': `calc(var(--croissant-ink-opacity) * ${c.opacity})`
} as CSSProperties)
</script>

<template>
  <div
    class="croissant-bg"
    aria-hidden="true"
  >
    <div class="croissant-bg__bloom croissant-bg__bloom--a" />
    <div class="croissant-bg__bloom croissant-bg__bloom--b" />

    <!--
      The croissant outline is defined once and instanced with <use>. It is the
      same drawing as the `i-lucide-croissant` icon used throughout the UI, so
      the backdrop and the interface share one motif.
    -->
    <svg
      class="croissant-bg__defs"
      width="0"
      height="0"
      focusable="false"
      aria-hidden="true"
    >
      <symbol
        id="croissant-silhouette"
        viewBox="0 0 24 24"
      >
        <g
          fill="none"
          stroke="currentColor"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="1.4"
        >
          <path d="m4.6 13.11l5.79-3.21c1.89-1.05 4.79 1.78 3.71 3.71l-3.22 5.81C8.8 23.16.79 15.23 4.6 13.11" />
          <path d="m10.5 9.5l-1-2.29C9.2 6.48 8.8 6 8 6H4.5C2.79 6 2 6.5 2 8.5a7.7 7.7 0 0 0 2 4.83M8 6c0-1.55.24-4-2-4c-2 0-2.5 2.17-2.5 4" />
          <path d="m14.5 13.5l2.29 1c.73.3 1.21.7 1.21 1.5v3.5c0 1.71-.5 2.5-2.5 2.5a7.7 7.7 0 0 1-4.83-2M18 16c1.55 0 4-.24 4 2c0 2-2.17 2.5-4 2.5" />
        </g>
      </symbol>
    </svg>

    <svg
      v-for="c in croissants"
      :key="c.id"
      class="croissant-bg__item"
      :class="{ 'croissant-bg__item--small': c.small }"
      viewBox="0 0 24 24"
      :style="styleFor(c)"
      focusable="false"
    >
      <use href="#croissant-silhouette" />
    </svg>
  </div>
</template>

<style scoped>
.croissant-bg {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
  background:
    radial-gradient(120% 80% at 15% 0%, var(--croissant-bg-tint-b), transparent 60%),
    radial-gradient(100% 70% at 85% 100%, var(--croissant-bg-tint-a), transparent 60%),
    var(--croissant-bg-base);
}

.croissant-bg__defs {
  position: absolute;
}

.croissant-bg__bloom {
  position: absolute;
  border-radius: 9999px;
  filter: blur(90px);
  will-change: transform;
}

.croissant-bg__bloom--a {
  top: -12vh;
  left: -8vw;
  width: 55vw;
  height: 55vw;
  background: radial-gradient(circle, var(--croissant-bg-tint-a), transparent 70%);
  animation: croissant-bloom 24s ease-in-out infinite;
}

.croissant-bg__bloom--b {
  right: -12vw;
  bottom: -18vh;
  width: 60vw;
  height: 60vw;
  background: radial-gradient(circle, var(--croissant-bg-tint-b), transparent 70%);
  animation: croissant-bloom 31s ease-in-out infinite reverse;
}

.croissant-bg__item {
  position: absolute;
  bottom: -20vh;
  color: var(--croissant-ink);
  opacity: 0;
  will-change: transform, opacity;
  animation-name: croissant-drift;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

@media (max-width: 640px) {
  .croissant-bg__item--small {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .croissant-bg__bloom,
  .croissant-bg__item {
    animation: none;
  }

  /* The drift keyframes start the croissants invisible and below the fold, so
     without the animation they have to be placed into view by hand. */
  .croissant-bg__item {
    transform: translate3d(0, -55vh, 0) rotate(var(--drift-rot-to));
    opacity: var(--drift-opacity);
  }
}
</style>
