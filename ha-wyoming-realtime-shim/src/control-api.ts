/**
 * Control API Server
 * HTTP REST API for PTT/VAD control
 */

import express, { Request, Response } from 'express';
import { logger } from './logging';
import { v4 as uuidv4 } from 'uuid';

interface SessionState {
  sessionId: string;
  mode: 'ptt' | 'vad';
  status: 'active' | 'ended';
  startTime: Date;
}

export function createControlAPI(): express.Application {
  const app = express();
  let currentSession: SessionState | null = null;
  let vadEnabled = false;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Error handler
  app.use((err: any, _req: Request, res: Response, next: any) => {
    if (err instanceof SyntaxError) {
      return res.status(400).json({
        error: 'parse_error',
        message: 'Invalid JSON in request body',
        timestamp: new Date().toISOString(),
      });
    }
    return next(err);
  });

  app.post('/start_ptt', (req: Request, res: Response) => {
    try {
      const { timeout_ms } = req.body;

      // Validate timeout
      if (timeout_ms !== undefined) {
        if (typeof timeout_ms !== 'number' || timeout_ms < 1000 || timeout_ms > 300000) {
          return res.status(400).json({
            error: 'invalid_timeout',
            message: 'Timeout must be between 1000 and 300000 ms',
            timestamp: new Date().toISOString(),
          });
        }
      }

      // Check if session already active
      if (currentSession && currentSession.status === 'active') {
        return res.status(400).json({
          error: 'session_active',
          message: 'PTT session already active',
          timestamp: new Date().toISOString(),
        });
      }

      // Create new session
      currentSession = {
        sessionId: uuidv4(),
        mode: 'ptt',
        status: 'active',
        startTime: new Date(),
      };

      logger.info('PTT session started', { 
        session_id: currentSession.sessionId,
        timeout_ms,
      });

      return res.json({
        session_id: currentSession.sessionId,
        mode: 'ptt',
        status: 'active',
        timestamp: new Date().toISOString(),
        audio_device: 'Default Input',
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to start PTT session', { error: errorMessage });
      return res.status(503).json({
        error: 'audio-device-error',
        message: 'Failed to initialize audio capture',
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.post('/stop_ptt', (_req: Request, res: Response) => {
    if (!currentSession || currentSession.status !== 'active') {
      return res.status(400).json({
        error: 'no_active_session',
        message: 'No active PTT session to stop',
        timestamp: new Date().toISOString(),
      });
    }

    currentSession.status = 'ended';

    logger.info('PTT session stopped', { 
      session_id: currentSession.sessionId,
    });

    const response = {
      session_id: currentSession.sessionId,
      mode: 'ptt',
      status: 'ended',
      timestamp: new Date().toISOString(),
    };

    currentSession = null;
    return res.json(response);
  });

  app.post('/toggle_vad', (_req: Request, res: Response) => {
    try {
      vadEnabled = !vadEnabled;

      logger.info('VAD mode toggled', { vad_enabled: vadEnabled });

      const response: any = {
        vad_enabled: vadEnabled,
        timestamp: new Date().toISOString(),
      };

      if (vadEnabled && !currentSession) {
        currentSession = {
          sessionId: uuidv4(),
          mode: 'vad',
          status: 'active',
          startTime: new Date(),
        };
        response.session_id = currentSession.sessionId;
      } else if (!vadEnabled && currentSession?.mode === 'vad') {
        currentSession = null;
      }

      return res.json(response);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Failed to toggle VAD', { error: errorMessage });
      return res.status(503).json({
        error: 'audio-device-error',
        message: 'Failed to configure voice activity detection',
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.get('/status', (_req: Request, res: Response) => {
    const response: any = {
      service_status: 'running',
      timestamp: new Date().toISOString(),
      vad_enabled: vadEnabled,
      audio_devices: [
        {
          device_id: 'default_input',
          name: 'Default Input',
          type: 'input',
          is_default: true,
          is_available: true,
        },
        {
          device_id: 'default_output',
          name: 'Default Output',
          type: 'output',
          is_default: true,
          is_available: true,
        }
      ],
      openai_connection: 'connected',
      ha_connection: 'connected',
    };

    if (currentSession) {
      response.current_session = {
        session_id: currentSession.sessionId,
        mode: currentSession.mode,
        status: currentSession.status,
        timestamp: new Date().toISOString(),
      };
    }

    return res.json(response);
  });

  app.get('/health', (_req: Request, res: Response) => {
    try {
      const memoryUsage = process.memoryUsage();
      const memoryPercentage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

      const healthStatus = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        checks: {
          audio_devices: true,
          openai_api: true,
          home_assistant: true,
          memory_usage: Math.round(memoryPercentage),
        },
      };

      // Check if any systems are unhealthy
      const isUnhealthy = Object.values(healthStatus.checks).some(check => 
        typeof check === 'boolean' ? !check : check > 90
      );

      if (isUnhealthy) {
        healthStatus.status = 'unhealthy';
        return res.status(503).json(healthStatus);
      }

      return res.json(healthStatus);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Health check failed', { error: errorMessage });
      return res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: {
          audio_devices: false,
          openai_api: false,
          home_assistant: false,
          memory_usage: 0,
        },
      });
    }
  });

  return app;
}
