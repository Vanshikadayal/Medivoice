import { EventEmitter } from 'events';
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalPiperTextToSpeechProvider } from './local-piper-text-to-speech.provider';

jest.mock('child_process', () => ({
  spawn: jest.fn(),
}));

jest.mock('fs/promises', () => ({
  mkdtemp: jest.fn().mockResolvedValue('/tmp/medivoice-piper-test'),
  readFile: jest.fn().mockResolvedValue(Buffer.from('wav-data')),
  rm: jest.fn().mockResolvedValue(undefined),
}));

import { spawn } from 'child_process';

describe('LocalPiperTextToSpeechProvider', () => {
  const configService = {
    get: jest.fn((key: string) => {
      if (key === 'voice.textToSpeech.executable') {
        return '/usr/local/bin/piper';
      }
      if (key === 'voice.textToSpeech.model') {
        return '/voices/en_US-lessac-medium.onnx';
      }
      if (key === 'voice.textToSpeech.config') {
        return '/voices/en_US-lessac-medium.onnx.json';
      }
      if (key === 'voice.textToSpeech.timeoutMs') {
        return 30000;
      }
      return undefined;
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('synthesizes WAV audio using Piper', async () => {
    const child = new EventEmitter() as EventEmitter & {
      stdin: { write: jest.Mock; end: jest.Mock };
      stderr: EventEmitter;
      kill: jest.Mock;
    };
    child.stdin = { write: jest.fn(), end: jest.fn() };
    child.stderr = new EventEmitter();
    child.kill = jest.fn();
    (spawn as jest.Mock).mockReturnValue(child);

    const provider = new LocalPiperTextToSpeechProvider(
      configService as unknown as ConfigService,
    );
    provider.onModuleInit();

    const promise = provider.synthesize('Hello from MediVoice.');
    await new Promise((resolve) => setImmediate(resolve));
    child.emit('close', 0);

    const result = await promise;

    expect(spawn).toHaveBeenCalledWith(
      '/usr/local/bin/piper',
      [
        '--model',
        '/voices/en_US-lessac-medium.onnx',
        '--output_file',
        expect.stringContaining('.wav'),
        '--config',
        '/voices/en_US-lessac-medium.onnx.json',
      ],
      expect.objectContaining({ stdio: ['pipe', 'ignore', 'pipe'] }),
    );
    expect(child.stdin.write).toHaveBeenCalledWith('Hello from MediVoice.');
    expect(result).toEqual({
      audioBuffer: Buffer.from('wav-data'),
      mimeType: 'audio/wav',
    });
  });

  it('throws when Piper is not configured', async () => {
    const missingConfig = {
      get: jest.fn(() => undefined),
    };

    const provider = new LocalPiperTextToSpeechProvider(
      missingConfig as unknown as ConfigService,
    );
    provider.onModuleInit();

    await expect(provider.synthesize('Hello')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it('throws when Piper exits with an error', async () => {
    const child = new EventEmitter() as EventEmitter & {
      stdin: { write: jest.Mock; end: jest.Mock };
      stderr: EventEmitter;
      kill: jest.Mock;
    };
    child.stdin = { write: jest.fn(), end: jest.fn() };
    child.stderr = new EventEmitter();
    child.kill = jest.fn();
    (spawn as jest.Mock).mockReturnValue(child);

    const provider = new LocalPiperTextToSpeechProvider(
      configService as unknown as ConfigService,
    );
    provider.onModuleInit();

    const promise = provider.synthesize('Hello');
    await new Promise((resolve) => setImmediate(resolve));
    child.emit('close', 1);

    await expect(promise).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('throws when Piper times out', async () => {
    jest.useFakeTimers();

    const child = new EventEmitter() as EventEmitter & {
      stdin: { write: jest.Mock; end: jest.Mock };
      stderr: EventEmitter;
      kill: jest.Mock;
    };
    child.stdin = { write: jest.fn(), end: jest.fn() };
    child.stderr = new EventEmitter();
    child.kill = jest.fn();
    (spawn as jest.Mock).mockReturnValue(child);

    const timeoutConfig = {
      get: jest.fn((key: string) => {
        if (key === 'voice.textToSpeech.executable') {
          return '/usr/local/bin/piper';
        }
        if (key === 'voice.textToSpeech.model') {
          return '/voices/en_US-lessac-medium.onnx';
        }
        if (key === 'voice.textToSpeech.timeoutMs') {
          return 10;
        }
        return undefined;
      }),
    };

    const provider = new LocalPiperTextToSpeechProvider(
      timeoutConfig as unknown as ConfigService,
    );
    provider.onModuleInit();

    const promise = provider.synthesize('Hello');
    const assertion = expect(promise).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );

    await jest.advanceTimersByTimeAsync(11);
    await assertion;
    expect(child.kill).toHaveBeenCalledWith('SIGKILL');

    jest.useRealTimers();
  });
});
