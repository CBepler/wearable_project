import { useEffect, useRef, useState, useCallback } from 'react';
import type { SensorData } from '../audio/types';
import { DEFAULT_SENSOR_DATA } from '../audio/types';

const WS_URL = `ws://${window.location.hostname}:8000/ws`;
const RECONNECT_DELAY = 2000; // ms

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

/**
 * Hook that connects to the FastAPI WebSocket bridge and streams
 * live SensorData from the BLE receiver into React state.
 *
 * @param enabled  Pass `true` to open the connection, `false` to disconnect.
 * @returns        The latest sensor reading and connection status.
 */
export function useLiveSensor(enabled: boolean) {
    const [sensorData, setSensorData] = useState<SensorData>(DEFAULT_SENSOR_DATA);
    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

    const connect = useCallback(() => {
        if (!enabled) return;

        // Don't open a second socket
        if (wsRef.current && wsRef.current.readyState <= WebSocket.OPEN) return;

        setStatus('connecting');
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => setStatus('connected');

        ws.onmessage = (event) => {
            try {
                const d = JSON.parse(event.data);
                setSensorData({
                    roll: d.roll ?? 0,
                    pitch: d.pitch ?? 0,
                    yaw: d.yaw ?? 0,
                    thumb: d.thumb ?? 0,
                    index: d.index ?? 0,
                    middle: d.middle ?? 0,
                    ring: d.ring ?? 0,
                    pinky: d.pinky ?? 0,
                });
            } catch {
                // Ignore malformed messages
            }
        };

        ws.onclose = () => {
            setStatus('disconnected');
            wsRef.current = null;
            if (enabled) {
                reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY);
            }
        };

        ws.onerror = () => {
            ws.close();
        };
    }, [enabled]);

    useEffect(() => {
        if (enabled) {
            connect();
        } else {
            // Disconnect when disabled
            clearTimeout(reconnectTimer.current);
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            setStatus('disconnected');
        }

        return () => {
            clearTimeout(reconnectTimer.current);
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [enabled, connect]);

    return { sensorData, status };
}
