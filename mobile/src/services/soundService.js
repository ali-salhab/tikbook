/**
 * SoundService — centralised audio manager for the app.
 *
 * Usage:
 *   import SoundService from '../services/soundService';
 *
 *   // Call once at app start (or per screen)
 *   await SoundService.preload();
 *
 *   // Then play anywhere:
 *   SoundService.play('tap');
 *   SoundService.play('like');
 *   SoundService.play('gift_send');
 *   etc.
 */

import { Audio } from "expo-av";

// ── sound map ─────────────────────────────────────────────────────────────────
const SOUNDS = {
  tap: require("../../assets/sounds/tap.mp3"),
  like: require("../../assets/sounds/like.mp3"),
  message: require("../../assets/sounds/message.mp3"),
  gift_send: require("../../assets/sounds/gift_send.mp3"),
  gift_receive: require("../../assets/sounds/gift_receive.mp3"),
  join: require("../../assets/sounds/join.mp3"),
  mic_on: require("../../assets/sounds/mic_on.mp3"),
  mic_off: require("../../assets/sounds/mic_off.mp3"),
  notification: require("../../assets/sounds/notification.mp3"),
};

// Volume levels per sound
const VOLUMES = {
  tap: 0.5,
  like: 0.7,
  message: 0.6,
  gift_send: 0.9,
  gift_receive: 1.0,
  join: 0.75,
  mic_on: 0.6,
  mic_off: 0.55,
  notification: 0.7,
};

class SoundService {
  constructor() {
    this._pool = {}; // { key: Sound instance }
    this._loaded = false;
    this._muted = false;
  }

  /** Pre-load all sounds. Call once (e.g. from App.js useEffect). */
  async preload() {
    if (this._loaded) return;
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      await Promise.all(
        Object.entries(SOUNDS).map(async ([key, src]) => {
          try {
            const { sound } = await Audio.Sound.createAsync(src, {
              shouldPlay: false,
              volume: VOLUMES[key] ?? 0.7,
            });
            this._pool[key] = sound;
          } catch (e) {
            console.warn(`[SoundService] Failed to load "${key}":`, e.message);
          }
        }),
      );
      this._loaded = true;
    } catch (e) {
      console.warn("[SoundService] preload error:", e.message);
    }
  }

  /**
   * Play a sound by key.
   * @param {string} key  - one of the keys in SOUNDS
   * @param {number} [volume] - optional override (0–1)
   */
  async play(key, volume) {
    if (this._muted) return;
    const sound = this._pool[key];
    if (!sound) {
      console.warn(`[SoundService] Sound not loaded: "${key}"`);
      return;
    }
    try {
      if (volume !== undefined) await sound.setVolumeAsync(volume);
      await sound.setPositionAsync(0);
      await sound.playAsync();
    } catch (_) {}
  }

  /** Mute / unmute all sounds. */
  setMuted(muted) {
    this._muted = muted;
  }

  isMuted() {
    return this._muted;
  }

  /** Unload all sounds (call on logout / full cleanup). */
  async unloadAll() {
    await Promise.all(
      Object.values(this._pool).map((s) => s.unloadAsync().catch(() => {})),
    );
    this._pool = {};
    this._loaded = false;
  }
}

// Singleton — one shared instance for the whole app
export default new SoundService();
