/**
 * Audio Device Manager
 * Handles PulseAudio/ALSA device management and audio streaming
 */
import { EventEmitter } from 'events';
import { Readable, Writable } from 'stream';
import { AudioDevice, AudioStreamConfig } from './types';
export declare class AudioDeviceManager extends EventEmitter {
    private devices;
    constructor();
    getInputDevices(): Promise<AudioDevice[]>;
    getOutputDevices(): Promise<AudioDevice[]>;
    getAllDevices(): Promise<AudioDevice[]>;
    getDefaultInputDevice(): Promise<AudioDevice | undefined>;
    createCaptureStream(config: AudioStreamConfig): Promise<Readable>;
    createPlaybackStream(_config: AudioStreamConfig): Promise<Writable>;
    refreshDevices(): Promise<void>;
    getDeviceCount(): number;
    getStreamLatency(_stream: Readable | Writable): Promise<{
        inputLatency: number;
    }>;
    applyHAConfiguration(config: any): Promise<void>;
    getCurrentConfiguration(): Promise<any>;
    checkAudioPermissions(): Promise<boolean>;
    checkPulseAudioStatus(): Promise<any>;
    getALSADevices(): Promise<any[]>;
    simulateDeviceDisconnection(): Promise<void>;
    simulateAudioSystemRestart(): Promise<void>;
    simulateStreamCorruption(stream: any): Promise<void>;
    getQualityMetrics(_stream: any): Promise<any>;
    cleanup(): void;
}
//# sourceMappingURL=audio.d.ts.map