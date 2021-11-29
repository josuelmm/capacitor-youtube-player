import { WebPlugin } from '@capacitor/core';

import type { YoutubePlayerPlugin } from './definitions';
import { Log } from './log';
import type { IPlayerSize, IPlayerState, IPlayerOptions, RequiredKeys } from './web/models/models';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function YT() {
  return (window as any)['YT'];
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function Player() {
  return YT().Player;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export function PlayerState() {
  return YT().PlayerState;
}

export class YoutubePlayerPluginWeb extends WebPlugin implements YoutubePlayerPlugin{

  players: any = [];
  playersEventsState = new Map<string, IPlayerState>();
  player: any;
  playerApiLoaded = false;
  private readonly defaultSizes: IPlayerSize = {
    height: 270,
    width: 367
  };
  playerLogger: any;

  constructor() {
    super({
      name: 'YoutubePlayerPluginWeb',
      platforms: ['web']
    });
  }

  async loadPlayerApi(): Promise<boolean> {
    this.playerLogger.log("loadPlayerApi");
    return await new Promise(resolve => {

      (window as any).onYouTubeIframeAPIReady = () => {
        this.playerLogger.log("onYouTubeIframeAPIReady");
        this.playerApiLoaded = true;
        resolve(true);
      }

      // This code loads the IFrame Player API code asynchronously.
      const tag = document.createElement('script');
      tag.type = 'text/javascript';
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode!.insertBefore(tag, firstScriptTag);
    });
  }

  checkSize(options: IPlayerOptions): IPlayerSize {
    const playerSize = {
      height: options.playerSize.height || this.defaultSizes.height,
      width: options.playerSize.width || this.defaultSizes.width
    };
    if (playerSize.height > window.innerHeight) playerSize.height = window.innerHeight;
    if (playerSize.width > window.innerWidth) playerSize.width = window.innerWidth;

    return playerSize;
  }

  // This function creates an <iframe> (and YouTube player)
  // after the API code downloads.
  async createPlayer(options: RequiredKeys<IPlayerOptions, 'playerId'>): Promise<{playerReady: boolean, player: string}> {
    this.playerLogger.log("createPlayer");
    const playerSize = this.checkSize(options);

    return await new Promise(resolve => {

      const player = Player();

      this.players[options.playerId] = new player(options.playerId, {
        playerVars: options.playerVars,
        ...playerSize,
        fullscreen: options.fullscreen,
        videoId: options.videoId,
        events: {
          // The API will call this function when the video player is ready.
          'onReady': () => {
            this.playerLogger.log(`player "${options.playerId}" -> onPlayerReady`);
            const state: IPlayerState = {events: {onReady: {text: 'onReady', value: true}}};
            this.playersEventsState.set(options.playerId, state);
            return resolve({ playerReady: true, player: this.players[options.playerId]});
          },
          'onStateChange': (event: any) => {
            this.playerLogger.log(`player "${options.playerId}" -> onPlayerStateChange`);
            switch (event.data) {
              case PlayerState().PLAYING:
                  this.playerLogger.log(`player "${options.playerId}" -> playing`);
                  this.playersEventsState.get(options.playerId)!.events.onStateChange = {text: 'playing', value: PlayerState().PLAYING};
                  if (options.fullscreen) {
                    const iframe = document.getElementById(options.playerId);
                    const requestFullScreen = iframe?.requestFullscreen
                    if (requestFullScreen) {
                      requestFullScreen.bind(iframe)();
                    }
                  }
                  break;
              case PlayerState().PAUSED:
                  this.playerLogger.log(`player "${options.playerId}" -> paused`);
                  this.playersEventsState.get(options.playerId)!.events.onStateChange = {text: 'paused', value: PlayerState().PAUSED};
                  break;
              case PlayerState().ENDED:
                  this.playerLogger.log(`player "${options.playerId}" -> ended`);
                  this.playersEventsState.get(options.playerId)!.events.onStateChange = {text: 'ended', value: PlayerState().ENDED};
                  break;
              case PlayerState().BUFFERING:
                this.playerLogger.log(`player "${options.playerId}" -> buffering`);
                this.playersEventsState.get(options.playerId)!.events.onStateChange = {text: 'buffering', value: PlayerState().BUFFERING};
                break;
              case PlayerState().CUED:
                this.playerLogger.log(`player "${options.playerId}" -> cued`);
                this.playersEventsState.get(options.playerId)!.events.onStateChange = {text: 'cued', value: PlayerState().CUED};
                break;
            }
          },
          'onPlaybackQualityChange': (event: any) => {
            this.playerLogger.log(`player "${options.playerId}" -> onPlayerPlaybackQualityChange quality ${event.data}`);
            this.playersEventsState.get(options.playerId)!.events.onPlaybackQualityChange = {text: 'onPlaybackQualityChange', value: event.data};
          },
          'onError': (error: any) => {
            this.playerLogger.error(`player "${options.playerId}" -> onPlayerError`, {error: error});
            this.playersEventsState.get(options.playerId)!.events.onError = {text: 'onError', value: error};
          }
        }
      });
    });
  }

  async initialize(options: RequiredKeys<IPlayerOptions, 'playerId'>): Promise<{playerReady: boolean, player: string} | undefined> {
    this.playerLogger = new Log(options.debug);
    this.playerLogger.log("initialize");
    if (!this.playerApiLoaded) {
      const result = await this.loadPlayerApi();
      this.playerLogger.log("loadPlayerApi result", {result: result});
    }
    if (this.playerApiLoaded) {
      const playerReady: {playerReady: boolean, player: string} = await this.createPlayer(options) as {playerReady: boolean, player: string};
      this.playerLogger.log("loadPlayerApi initialize completed", {playerReady: playerReady});
      return Promise.resolve(playerReady);
    }
  }

  async destroy(playerId: string): Promise<{result: { method: string, value: boolean }}> {
    this.playerLogger.log(`player "${playerId}" -> destroy`);
    this.players[playerId].destroy();
    return Promise.resolve({result: { method: 'destroy', value: true }});
  }


  // Methods playback controls and player settings.

  /*********/

  // Stops and cancels loading of the current video. This function should be reserved for rare situations when you know that the user will not be watching
  // additional video in the player. If your intent is to pause the video, you should just call the pauseVideo function. If you want to change the video
  // that the player is playing, you can call one of the queueing functions without calling stopVideo first.
  async stopVideo(playerId: string): Promise<{result: { method: string, value: boolean }}> {
    this.playerLogger.log(`player "${playerId}" ->  stopVideo`);
    this.players[playerId].stopVideo();
    return Promise.resolve({result: { method: 'stopVideo', value: true }});
  }

  // Plays the currently cued/loaded video. The final player state after this function executes will be playing (1).
  async playVideo(playerId: string): Promise<{result: { method: string, value: boolean }}> {
    this.playerLogger.log(`player "${playerId}" -> playVideo`);
    this.players[playerId].playVideo();
    return Promise.resolve({result: { method: 'playVideo', value: true }});
  }

  // Pauses the currently playing video. The final player state after this function executes will be paused (2) unless the player is in the ended (0) 
  // state when the function is called, in which case the player state will not change.
  async pauseVideo(playerId: string): Promise<{result: { method: string, value: boolean }}> {
    this.playerLogger.log(`player "${playerId}" -> pauseVideo`);
    this.players[playerId].pauseVideo();
    return Promise.resolve({result: { method: 'pauseVideo', value: true }});
  }

  // Seeks to a specified time in the video. If the player is paused when the function is called, it will remain paused. If the function is called from
  // another state (playing, video cued, etc.), the player will play the video.
  async seekTo(playerId: string, seconds: number, allowSeekAhead: boolean)
  : Promise<{result: { method: string, value: boolean, seconds: number, allowSeekAhead: boolean }}> {
    this.playerLogger.log(`player "${playerId}" -> seekTo ${seconds} seconds`);
    this.players[playerId].seekTo(seconds, allowSeekAhead);
    return Promise.resolve({result: { method: 'seekTo', value: true, seconds: seconds, allowSeekAhead: allowSeekAhead }});
  }

  // Loads and plays the specified video.
  async loadVideoById(playerId: string, options: {videoId: string, startSeconds?: number, endSeconds?: number, suggestedQuality?: string})
  : Promise<{result: { method: string, value: boolean, options: {videoId: string, startSeconds?: number, endSeconds?: number, suggestedQuality?: string}}}> {
    this.playerLogger.log(`player "${playerId}" -> loadVideoById with options ${options}`);
    this.players[playerId].loadVideoById(options);
    return Promise.resolve({result: { method: 'loadVideoById', value: true, options: options }});
  }

  // Loads the specified video's thumbnail and prepares the player to play the video. The player does not request the FLV until playVideo() or seekTo() is called.
  async cueVideoById(playerId: string, options: {videoId: string, startSeconds?: number, endSeconds?: number, suggestedQuality?: string})
  : Promise<{result: { method: string, value: boolean, options: {videoId: string, startSeconds?: number, endSeconds?: number, suggestedQuality?: string}}}> {
    this.playerLogger.log(`player "${playerId}" -> cueVideoById with options ${options}`);
    this.players[playerId].cueVideoById(options);
    return Promise.resolve({result: { method: 'cueVideoById', value: true, options: options }});
  }

  /*********/

  // Methods changing the player volume.

  /*********/

  // Mutes the player.
  async mute(playerId: string): Promise<{result: { method: string, value: boolean }}> {
    this.playerLogger.log(`player "${playerId}" -> mute`);
    this.players[playerId].mute();
    return Promise.resolve({result: { method: 'mute', value: true }});
  }

  // Unmutes the player.
  async unMute(playerId: string): Promise<{result: { method: string, value: boolean }}> {
    this.playerLogger.log(`player "${playerId}" -> unMute`);
    this.players[playerId].unMute();
    return Promise.resolve({result: { method: 'unMute', value: true }});
  }

  // Returns true if the player is muted, false if not.
  async isMuted(playerId: string): Promise<{result: { method: string, value: boolean }}> {
    this.playerLogger.log(`player "${playerId}" -> isMuted`);
    return Promise.resolve({result: { method: 'isMuted', value: this.players[playerId].isMuted() }});
  }

  // Sets the volume. Accepts an integer between 0 and 100.
  async setVolume(playerId: string, volume: number): Promise<{result: { method: string, value: number }}> {
    this.playerLogger.log(`player "${playerId}" -> setVolume ${volume}`);
    this.players[playerId].setVolume(volume);
    return Promise.resolve({result: { method: 'setVolume', value: volume }});
  }

  // Returns the player's current volume, an integer between 0 and 100. Note that getVolume() will return the volume even if the player is muted.
  async getVolume(playerId: string): Promise<{result: { method: string, value: number }}> {
    this.playerLogger.log(`player "${playerId}" -> getVolume`);
    return Promise.resolve({result: { method: 'getVolume', value: this.players[playerId].getVolume() }});
  }

  /*********/

  // Methods setting the player size.

  /*********/

  // Sets the size in pixels of the <iframe> that contains the player.
  async setSize(playerId: string, width: number, height: number): Promise<{result: { method: string, value: IPlayerSize }}> {
    this.playerLogger.log(`player "${playerId}" -> setSize width: ${width} height: ${height}`);
    this.players[playerId].setSize(width, height);
    return Promise.resolve({result: { method: 'setSize', value: {width: width, height: height} }});
  }

  /*********/

  // Methods playback status.

  /*********/

  // Returns a number between 0 and 1 that specifies the percentage of the video that the player shows as buffered.
  // This method returns a more reliable number than the now-deprecated getVideoBytesLoaded and getVideoBytesTotal methods.
  async getVideoLoadedFraction(playerId: string): Promise<{result: { method: string, value: number }}> {
    this.playerLogger.log(`player "${playerId}" -> getVideoLoadedFraction`);
    return Promise.resolve({result: { method: 'getVideoLoadedFraction', value: this.players[playerId].getVideoLoadedFraction() }});
  }

  // Returns the state of the player. Possible values are:
  // -1 – unstarted
  // 0 – ended
  // 1 – playing
  // 2 – paused
  // 3 – buffering
  // 5 – video cued
  async getPlayerState(playerId: string): Promise<{result: { method: string, value: number }}> {
    this.playerLogger.log(`player "${playerId}" -> getPlayerState`);
    return Promise.resolve({result: { method: 'getPlayerState', value: this.players[playerId].getPlayerState() }});
  }

  async getAllPlayersEventsState(): Promise<{result: { method: string, value: Map<string, IPlayerState> }}> {
    this.playerLogger.log("getAllPlayersEventsState");
    return Promise.resolve({result: { method: 'getAllPlayersEventsState', value: this.playersEventsState }});
  }

  // Returns the elapsed time in seconds since the video started playing.
  async getCurrentTime(playerId: string): Promise<{result: { method: string, value: number }}> {
    this.playerLogger.log(`player "${playerId}" -> getCurrentTime`);
    return Promise.resolve({result: { method: 'getCurrentTime', value: this.players[playerId].getCurrentTime() }});
  }

  async toggleFullScreen(playerId: string, isFullScreen: boolean | null | undefined): Promise<{result: { method: string, value: boolean | null | undefined }}> {
    this.playerLogger.log(`player "${playerId}" -> toggleFullScreen`);
    let { height, width } = this.defaultSizes;

    if (!isFullScreen) {
      height = window.innerHeight;
      width = window.innerWidth;
    }

    this.players[playerId].setSize(width, height);
    return Promise.resolve({result: { method: 'toggleFullScreen', value: isFullScreen }});
  }

}
