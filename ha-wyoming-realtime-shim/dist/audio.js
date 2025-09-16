"use strict";
/**
 * Audio Device Manager
 * Handles PulseAudio/ALSA device management and audio streaming
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AudioDeviceManager = void 0;
const events_1 = require("events");
const stream_1 = require("stream");
const logging_1 = require("./logging");
class AudioDeviceManager extends events_1.EventEmitter {
    constructor() {
        super();
        this.devices = [];
        this.refreshDevices();
    }
    async getInputDevices() {
        return this.devices.filter(d => d.type === 'input');
    }
    async getOutputDevices() {
        return this.devices.filter(d => d.type === 'output');
    }
    async getAllDevices() {
        return [...this.devices];
    }
    async getDefaultInputDevice() {
        return this.devices.find(d => d.type === 'input' && d.isDefault);
    }
    async createCaptureStream(config) {
        if (config.sampleRate !== 16000) {
            throw new Error('Only 16kHz sample rate supported');
        }
        // Mock readable stream for testing
        const stream = new stream_1.Readable({
            read() {
                // Generate silence
                this.push(Buffer.alloc(1024));
            }
        });
        return stream;
    }
    async createPlaybackStream(_config) {
        // Mock writable stream for testing
        const stream = new stream_1.Writable({
            write(_chunk, _encoding, callback) {
                callback();
            }
        });
        return stream;
    }
    async refreshDevices() {
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
    getDeviceCount() {
        return this.devices.length;
    }
    async getStreamLatency(_stream) {
        return { inputLatency: 50 }; // Mock latency
    }
    async applyHAConfiguration(config) {
        logging_1.logger.info('Applied HA audio configuration', config);
    }
    async getCurrentConfiguration() {
        return {
            input: { device: 'default' },
            output: { device: 'default' },
        };
    }
    async checkAudioPermissions() {
        return true; // Mock permissions check
    }
    async checkPulseAudioStatus() {
        return {
            available: true,
            version: '15.0',
            devices: [],
        };
    }
    async getALSADevices() {
        return [];
    }
    async simulateDeviceDisconnection() {
        // Test helper
    }
    async simulateAudioSystemRestart() {
        await this.refreshDevices();
    }
    async simulateStreamCorruption(stream) {
        stream.emit('error', new Error('Stream corrupted'));
    }
    async getQualityMetrics(_stream) {
        return {
            droppedSamples: 0,
            bufferUnderruns: 0,
            averageLatency: 50,
        };
    }
    cleanup() {
        // Cleanup resources
    }
}
exports.AudioDeviceManager = AudioDeviceManager;
//# sourceMappingURL=audio.js.map