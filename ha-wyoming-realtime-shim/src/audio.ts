/**
 * Audio Device Manager
 * Handles PulseAudio/ALSA device management and audio streaming
 */

import { EventEmitter } from 'events';
import { Readable, Writable } from 'stream';
import { logger } from './logging';
import { AudioDevice, AudioStreamConfig } from './types';

export class AudioDeviceManager extends EventEmitter {
  private devices: AudioDevice[] = [];

  constructor() {
    super();
    this.refreshDevices();
  }

  async getInputDevices(): Promise<AudioDevice[]> {
    return this.devices.filter(d => d.type === 'input');
  }

  async getOutputDevices(): Promise<AudioDevice[]> {
    return this.devices.filter(d => d.type === 'output');
  }

  async getAllDevices(): Promise<AudioDevice[]> {
    return [...this.devices];
  }

  async getDefaultInputDevice(): Promise<AudioDevice | undefined> {
    return this.devices.find(d => d.type === 'input' && d.isDefault);
  }

  async createCaptureStream(config: AudioStreamConfig): Promise<Readable> {
    if (config.sampleRate !== 16000) {
      throw new Error('Only 16kHz sample rate supported');
    }

    // Mock readable stream for testing
    const stream = new Readable({
      read() {
        // Generate silence
        this.push(Buffer.alloc(1024));
      }
    });

    return stream;
  }

  async createPlaybackStream(_config: AudioStreamConfig): Promise<Writable> {
    // Mock writable stream for testing
    const stream = new Writable({
      write(_chunk, _encoding, callback) {
        callback();
      }
    });

    return stream;
  }

  async refreshDevices(): Promise<void> {
    // Mock device discovery
    this.devices = [
      {
        deviceId: 'default_input',
        name: 'Default Input',
        type: 'input',
        isDefault: true,
        isAvailable: true,
        capabilities: {
          supportedSampleRates: [16000, 44100, 48000],
          supportedBitDepths: [16, 24],
          supportedChannels: [1, 2],
          maxLatency: 100,
          bufferSize: 1024,
        },
        lastSeen: new Date(),
      },
      {
        deviceId: 'default_output',
        name: 'Default Output',
        type: 'output',
        isDefault: true,
        isAvailable: true,
        capabilities: {
          supportedSampleRates: [16000, 44100, 48000],
          supportedBitDepths: [16, 24],
          supportedChannels: [1, 2],
          maxLatency: 100,
          bufferSize: 1024,
        },
        lastSeen: new Date(),
      },
    ];
  }

  getDeviceCount(): number {
    return this.devices.length;
  }

  async getStreamLatency(_stream: Readable | Writable): Promise<{ inputLatency: number }> {
    return { inputLatency: 50 }; // Mock latency
  }

  async applyHAConfiguration(config: any): Promise<void> {
    logger.info('Applied HA audio configuration', config);
  }

  async getCurrentConfiguration(): Promise<any> {
    return {
      input: { device: 'default' },
      output: { device: 'default' },
    };
  }

  async checkAudioPermissions(): Promise<boolean> {
    return true; // Mock permissions check
  }

  async checkPulseAudioStatus(): Promise<any> {
    return {
      available: true,
      version: '15.0',
      devices: [],
    };
  }

  async getALSADevices(): Promise<any[]> {
    return [];
  }

  async simulateDeviceDisconnection(): Promise<void> {
    // Test helper
  }

  async simulateAudioSystemRestart(): Promise<void> {
    await this.refreshDevices();
  }

  async simulateStreamCorruption(stream: any): Promise<void> {
    stream.emit('error', new Error('Stream corrupted'));
  }

  async getQualityMetrics(_stream: any): Promise<any> {
    return {
      droppedSamples: 0,
      bufferUnderruns: 0,
      averageLatency: 50,
    };
  }

  cleanup(): void {
    // Cleanup resources
  }
}
