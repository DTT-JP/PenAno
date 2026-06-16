/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/* state.ts - アプリケーション状態変数 */
import type { LabelColors } from './types/storage';

export let _labels: string[] = [];
export let _labelColors: LabelColors = {};
export let _activeLabel: string | null = null;

export function setLabels(newLabels: string[]): void { _labels = newLabels; }
export function setLabelColors(newColors: LabelColors): void { _labelColors = newColors; }
export function setActiveLabel(newLabel: string | null): void { _activeLabel = newLabel; }