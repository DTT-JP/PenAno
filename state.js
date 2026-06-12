/* Copyright (c) 2026 DTT-JP. Released under the MIT license. */
/* state.js - アプリケーション状態変数 */

export let _labels = [];

export let _labelColors = {};

export let _activeLabel = null;

export function setLabels(newLabels) { _labels = newLabels; }
export function setLabelColors(newColors) { _labelColors = newColors; }
export function setActiveLabel(newLabel) { _activeLabel = newLabel; }