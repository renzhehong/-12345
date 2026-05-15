/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Keyframe {
  id: string;
  videoId: string;
  time: number;
  note: string;
  groupId: string;
  createdAt: number;
}

export interface Group {
  id: string;
  name: string;
  color: string;
}

export interface VideoEntry {
  id: string;
  title: string;
  url: string;
  type: 'file' | 'url';
  lastAccessed: number;
}
