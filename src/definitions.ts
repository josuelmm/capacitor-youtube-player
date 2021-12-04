import type { IPlayerState, IPlayerOptions } from './web/models/models';

export interface YoutubePlayerPlugin {
  initialize(options: IPlayerOptions): Promise<{playerReady: boolean, player: string} | undefined>;
  destroy(playerId: string): Promise<{result: { method: string, value: boolean }}>;
  // Methods playback controls and player settings..
  /***********/
  stopVideo(playerId: string): Promise<{result: { method: string, value: boolean }}>;
  playVideo(playerId: string): Promise<{result: { method: string, value: boolean }}>;
  pauseVideo(playerId: string): Promise<{result: { method: string, value: boolean }}>;
  seekTo(playerId: string, seconds: number, allowSeekAhead: boolean): Promise<{result: { method: string, value: boolean, seconds: number, allowSeekAhead: boolean }}>;
  loadVideoById(playerId: string, options: {videoId: string, startSeconds?: number, endSeconds?: number, suggestedQuality?: string}): Promise<{result: { method: string, value: boolean, options: {videoId: string, startSeconds?: number, endSeconds?: number, suggestedQuality?: string} }}>;
  cueVideoById(playerId: string, options: {videoId: string, startSeconds?: number, endSeconds?: number, suggestedQuality?: string}): Promise<{result: { method: string, value: boolean, options: {videoId: string, startSeconds?: number, endSeconds?: number, suggestedQuality?: string} }}>;
  /***********/

  // Methods for playing playlist.
  /***********/
  cuePlaylist(
    playlist: string | string[],
    index: number,
    startSeconds: number,
    suggestedQuality: string): Promise<{result: { method: string, value: boolean }}>;
  loadPlaylist(playlist: string | string[],
      index: number,
      startSeconds: number,
      suggestedQuality: string): Promise<{result: { method: string, value: boolean }}>;
  /***********/

  /***********/

  // Methods changing the player volume.
  /***********/
  mute(playerId: string): Promise<{result: { method: string, value: boolean }}>;
  unMute(playerId: string): Promise<{result: { method: string, value: boolean }}>;
  isMuted(playerId: string): Promise<{result: { method: string, value: boolean }}>;
  setVolume(playerId: string, volume: number): Promise<{result: { method: string, value: number }}>;
  getVolume(playerId: string): Promise<{result: { method: string, value: number }}>;
  /***********/

  // Methods setting the player size.
  /***********/
  setSize(playerId: string, width: number, height: number): Promise<{result: { method: string, value: {width: number, height: number} }}>;
  /***********/

  // Methods playback status.
  /***********/
  getVideoLoadedFraction(playerId: string): Promise<{result: { method: string, value: number }}>;
  getPlayerState(playerId: string): Promise<{result: { method: string, value: number }}>;
  getAllPlayersEventsState(): Promise<{result: { method: string, value: Map<string, IPlayerState> }}>;
  getCurrentTime(playerId: string): Promise<{result: { method: string, value: number }}>;
  toggleFullScreen(playerId: string, isFullScreen: boolean | null | undefined): Promise<{result: { method: string, value: boolean | null | undefined }}>;
  /***********/
}
