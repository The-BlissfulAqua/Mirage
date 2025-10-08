import { Actor, Sensor, SensorEvent, Weather, Alert, DetectionRule } from './types';
import { PRNG } from '../../utils/prng';

// Haversine distance function
const getDistance = (pos1: [number, number], pos2: [number, number]): number => {
    const R = 6371e3; // metres
    const φ1 = pos1[0] * Math.PI / 180;
    const φ2 = pos2[0] * Math.PI / 180;
    const Δφ = (pos2[0] - pos1[0]) * Math.PI / 180;
    const Δλ = (pos2[1] - pos1[1]) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

/**
 * Creates a raw sensor event if an actor is detected by a sensor.
 */
const generateSensorEvent = (actor: Actor, sensor: Sensor, weather: Weather, prng: PRNG): SensorEvent | null => {
    const distance = getDistance(actor.pos, sensor.pos);
    
    if (distance <= sensor.range) {
        let detectionProb = sensor.base_p;
        const penalty = sensor.weather_penalty[weather];
        if (penalty) detectionProb *= penalty;
        detectionProb *= (1 - distance / sensor.range); // Distance falloff
        if (actor.type === 'adversary') detectionProb *= 0.8; // Adversary is slightly harder to detect

        if (prng.random() < detectionProb) {
            return {
                timestamp: Date.now(),
                sensorId: sensor.id,
                actorId: actor.id,
                confidence: detectionProb,
                actorPos: actor.pos,
            };
        }
    }
    return null;
};

interface DetectionState {
    [ruleId: string]: any;
}

/**
 * Processes sensor events against a set of rules to generate alerts.
 */
export const runDetectionLogic = (
    actors: Actor[], 
    sensors: Sensor[], 
    weather: Weather, 
    prng: PRNG,
    rules: DetectionRule[],
    currentState: DetectionState
): { newAlerts: Alert[], newEvents: SensorEvent[], updatedState: DetectionState } => {
    const newAlerts: Alert[] = [];
    const newEvents: SensorEvent[] = [];

    // 1. Generate events for all actors from all sensors
    for (const actor of actors) {
        for (const sensor of sensors) {
            const event = generateSensorEvent(actor, sensor, weather, prng);
            if (event) newEvents.push(event);
        }
    }

    if (newEvents.length === 0) {
        return { newAlerts, newEvents, updatedState: currentState };
    }

    const nextState = { ...currentState };
    const now = Date.now();
    const adversary = actors.find(a => a.type === 'adversary');

    rules.forEach(rule => {
        switch (rule.type) {
            case 'high_confidence_sighting': {
                const adversaryEvent = newEvents.find(e => e.actorId === adversary?.id && e.confidence > rule.params.min_confidence);
                if (adversaryEvent) {
                    newAlerts.push({
                        id: `alert-hc-${now}`, timestamp: now, level: 'critical',
                        message: `High confidence sighting of adversary by ${adversaryEvent.sensorId}.`,
                        relatedEvents: [adversaryEvent]
                    });
                }
                break;
            }

            case 'persistent_sighting': {
                const stateKey = rule.id;
                const history: SensorEvent[] = (nextState[stateKey] || []).filter(
                    (e: SensorEvent) => now - e.timestamp < rule.params.time_window_s * 1000
                );
                const adversaryEvents = newEvents.filter(e => e.actorId === adversary?.id);
                history.push(...adversaryEvents);

                if (history.length >= rule.params.min_detections) {
                    newAlerts.push({
                        id: `alert-ps-${now}`, timestamp: now, level: 'critical',
                        message: `Persistent presence of adversary detected.`,
                        relatedEvents: history
                    });
                    nextState[stateKey] = []; // Reset after firing
                } else {
                    nextState[stateKey] = history;
                }
                break;
            }
             
            case 'group_sighting': {
                const stateKey = rule.id;
                const history: SensorEvent[] = (nextState[stateKey] || []).concat(newEvents).filter(
                     (e: SensorEvent) => now - e.timestamp < rule.params.time_window_s * 1000
                );
                nextState[stateKey] = history;
                
                const adversaryEventsThisTick = newEvents.filter(e => e.actorId === adversary?.id);

                for (const advEvent of adversaryEventsThisTick) {
                    const nearbyActorIds = new Set<string>([advEvent.actorId]);
                    for (const histEvent of history) {
                         if (getDistance(advEvent.actorPos, histEvent.actorPos) < rule.params.radius_m) {
                            nearbyActorIds.add(histEvent.actorId);
                         }
                    }
                    if (nearbyActorIds.size >= rule.params.min_actors) {
                        const cooldownKey = `${stateKey}-cooldown`;
                        if (!nextState[cooldownKey] || now > nextState[cooldownKey]) {
                            newAlerts.push({
                                id: `alert-gs-${now}`, timestamp: now, level: 'critical',
                                message: `Suspicious group of ${nearbyActorIds.size} actors detected near adversary.`,
                                relatedEvents: []
                            });
                            nextState[cooldownKey] = now + (rule.params.time_window_s * 1000); // Cooldown to prevent spam
                        }
                    }
                }
                break;
            }
        }
    });

    return { newAlerts, newEvents, updatedState: nextState };
};