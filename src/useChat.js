import { useState, useEffect, useCallback } from 'react';
import mqtt from 'mqtt';

// Use a public MQTT broker that supports WebSockets
const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';
// Add a unique prefix to avoid colliding with other apps using the same public broker
const TOPIC_PREFIX = 'espresso-chat-app-v1/';

export function useChat(room, userProfile) {
  const [messages, setMessages] = useState([]);
  const [client, setClient] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!userProfile) return;

    // Load messages from sessionStorage when mounting so they persist across room switches
    const storedMessages = sessionStorage.getItem('espresso-messages');
    if (storedMessages) {
      try {
        setMessages(JSON.parse(storedMessages));
      } catch (e) {
        console.error('Failed to parse stored messages', e);
      }
    }

    const mqttClient = mqtt.connect(BROKER_URL, {
      clientId: `espresso_${Math.random().toString(16).slice(3)}`,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000,
    });

    mqttClient.on('connect', () => {
      console.log('Connected to MQTT Broker');
      setIsConnected(true);
      // Subscribe to all rooms so messages are received even if not currently in that room
      mqttClient.subscribe(`${TOPIC_PREFIX}#`, (err) => {
        if (err) console.error('Subscription error:', err);
      });
    });

    mqttClient.on('message', (topic, payload) => {
      try {
        const messageStr = payload.toString();
        const messageData = JSON.parse(messageStr);
        
        const messageRoom = topic.replace(TOPIC_PREFIX, '');
        
        const newMessage = {
          ...messageData,
          room: messageRoom,
          id: `${Date.now()}_${Math.random()}`,
        };

        setMessages((prev) => {
          const updated = [...prev, newMessage];
          sessionStorage.setItem('espresso-messages', JSON.stringify(updated));
          return updated;
        });
      } catch (e) {
        console.error('Failed to process message', e);
      }
    });

    setClient(mqttClient);

    return () => {
      mqttClient.end();
    };
  }, [userProfile]); // re-run only if profile changes or unmounts

  const sendMessage = useCallback((text) => {
    if (client && isConnected && text.trim() && room) {
      const topic = `${TOPIC_PREFIX}${room}`;
      const payload = JSON.stringify({
        text: text.trim(),
        sender: userProfile.nickname,
        timestamp: new Date().toISOString(),
        gender: userProfile.gender,
        age: userProfile.age,
        location: userProfile.location
      });
      client.publish(topic, payload, { qos: 0 });
    }
  }, [client, isConnected, room, userProfile]);

  // Filter messages for the current room
  const currentRoomMessages = messages.filter(m => m.room === room);

  return { messages: currentRoomMessages, sendMessage, isConnected };
}
