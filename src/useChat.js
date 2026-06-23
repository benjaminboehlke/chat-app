import { useState, useEffect, useCallback } from 'react';
import mqtt from 'mqtt';

// Use a public MQTT broker that supports WebSockets
const BROKER_URL = 'wss://broker.emqx.io:8084/mqtt';
// Add a unique prefix to avoid colliding with other apps using the same public broker
const TOPIC_PREFIX = 'espresso-chat-app-v1/';

export function useChat(room, userProfile) {
  const [messages, setMessages] = useState([]);
  const [activeUsers, setActiveUsers] = useState(new Map());
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

    const clientId = `espresso_${Math.random().toString(16).slice(3)}`;
    const presenceTopic = `${TOPIC_PREFIX}presence/${clientId}`;

    const mqttClient = mqtt.connect(BROKER_URL, {
      clientId,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000,
      will: {
        topic: presenceTopic,
        payload: '',
        retain: true,
        qos: 1
      }
    });

    mqttClient.on('connect', () => {
      console.log('Connected to MQTT Broker');
      setIsConnected(true);
      
      // Publish our own online presence with the user profile
      mqttClient.publish(presenceTopic, JSON.stringify(userProfile), { retain: true, qos: 1 });

      // Subscribe to all rooms and presence updates
      mqttClient.subscribe([`${TOPIC_PREFIX}#`, `${TOPIC_PREFIX}presence/+`], (err) => {
        if (err) console.error('Subscription error:', err);
      });
    });

    mqttClient.on('message', (topic, payload) => {
      try {
        const messageStr = payload.toString();

        // Handle presence messages
        if (topic.startsWith(`${TOPIC_PREFIX}presence/`)) {
          const userId = topic.split('/').pop();
          if (messageStr.length === 0) {
            // Empty payload means offline
            setActiveUsers(prev => {
              const newMap = new Map(prev);
              newMap.delete(userId);
              return newMap;
            });
          } else {
            // User is online
            const userData = JSON.parse(messageStr);
            setActiveUsers(prev => {
              const newMap = new Map(prev);
              newMap.set(userId, userData);
              return newMap;
            });
          }
          return;
        }

        // Handle chat messages
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
      // Clear our presence before disconnecting cleanly
      mqttClient.publish(presenceTopic, '', { retain: true, qos: 1 });
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
        location: userProfile.location,
        avatar: userProfile.avatar || null,
      });
      client.publish(topic, payload, { qos: 0 });
    }
  }, [client, isConnected, room, userProfile]);

  // Filter messages for the current room
  const currentRoomMessages = messages.filter(m => m.room === room);
  const activeUsersList = Array.from(activeUsers.values());

  return { messages: currentRoomMessages, sendMessage, isConnected, activeUsers: activeUsersList };
}
