import {
  EaseInCubic,
  EaseInQuad,
  EaseOutCubic,
  EaseOutQuad,
  Linear,
} from '../CanvasPainter/TimingFns'
import { FadeIn, FadeOut } from '../CanvasPainter/Transitions/Fade'
import { WipeIn, WipeOut } from '../CanvasPainter/Transitions/Wipe'
import type {
  TProcessedPreviewOptions,
  TProcessedTextureTilingOptions,
  TProcessedTransitionOptions,
  TTimingFn,
  TTransition,
} from './types'

export enum TTransitionName {
  FADE_IN = 'FadeIn',
  FADE_OUT = 'FadeOut',
  WIPE_IN = 'WipeIn',
  WIPE_OUT = 'WipeOut',
}

export enum TTimingFnName {
  LINEAR = 'Linear',
  EASE_IN_QUAD = 'EaseInQuad',
  EASE_OUT_QUAD = 'EaseOutQuad',
  EASE_IN_CUBIC = 'EaseInCubic',
  EASE_OUT_CUBIC = 'EaseOutCubic',
}

export const TRANSITION_MAP: Record<TTransitionName, TTransition> = {
  [TTransitionName.FADE_IN]: FadeIn,
  [TTransitionName.FADE_OUT]: FadeOut,
  [TTransitionName.WIPE_IN]: WipeIn,
  [TTransitionName.WIPE_OUT]: WipeOut,
}

export const TIMING_FN_MAP: Record<TTimingFnName, TTimingFn> = {
  [TTimingFnName.LINEAR]: Linear,
  [TTimingFnName.EASE_IN_QUAD]: EaseInQuad,
  [TTimingFnName.EASE_OUT_QUAD]: EaseOutQuad,
  [TTimingFnName.EASE_IN_CUBIC]: EaseInCubic,
  [TTimingFnName.EASE_OUT_CUBIC]: EaseOutCubic,
}

export const DEFAULT_TEXTURE_TILING_OPTIONS: TProcessedTextureTilingOptions = {
  scale: 0.2,
  angle: 0,
}

export const DEFAULT_TRANSITION_OPTIONS: TProcessedTransitionOptions = {
  entry: FadeIn,
  exit: FadeOut,
  speed: 0.05,
  timingFn: EaseOutCubic,
}

export const DEFAULT_PREVIEW_OPTIONS: TProcessedPreviewOptions = {
  transitionOptions: DEFAULT_TRANSITION_OPTIONS,
}

export const DEFAULT_TEXTURE_SCALE = 1
