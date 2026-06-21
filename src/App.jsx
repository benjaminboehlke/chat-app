import { useState, useEffect } from 'react';
import { useChat } from './useChat';
import { Coffee, MapPin, Hash, Send, Menu, X } from 'lucide-react';
import './index.css';

const ROOMS = [
  { id: 'nightlife', name: 'Nightlife', icon: '🌙' },
  { id: 'sports', name: 'Sports', icon: '⚽' },
  { id: 'events', name: 'Events', icon: '🎉' }
];

function App() {
  const [userProfile, setUserProfile] = useState(null);
  const [showModal, setShowModal] = useState(true);
  const [activeRoom, setActiveRoom] = useState(ROOMS[0].id);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [locationQuery, setLocationQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const fetchSuggestions = async (query) => {
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`);
      const data = await res.json();
      setSuggestions(data);
    } catch (err) {
      console.error("Failed to fetch location suggestions", err);
    }
  };

  const handleLocationChange = (e) => {
    const val = e.target.value;
    setLocationQuery(val);
    setSelectedLocation(null);
    fetchSuggestions(val);
  };

  const handleSuggestionClick = (suggestion) => {
    // Simplify the display name (e.g. keep just the city/town name)
    const shortName = suggestion.display_name.split(',')[0];
    setLocationQuery(shortName);
    setSelectedLocation({
      lat: suggestion.lat,
      lon: suggestion.lon
    });
    setSuggestions([]);
  };

  useEffect(() => {
    const profile = localStorage.getItem('espresso-profile');
    if (profile) {
      setUserProfile(JSON.parse(profile));
      setShowModal(false);
    }
  }, []);

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const profile = {
      nickname: formData.get('nickname'),
      age: formData.get('age'),
      gender: formData.get('gender'),
      location: locationQuery,
      lat: selectedLocation?.lat || null,
      lon: selectedLocation?.lon || null,
    };
    localStorage.setItem('espresso-profile', JSON.stringify(profile));
    setUserProfile(profile);
    setShowModal(false);
  };

  const { messages, sendMessage, isConnected } = useChat(activeRoom, userProfile);
  const [inputText, setInputText] = useState('');

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      sendMessage(inputText);
      setInputText('');
    }
  };

  return (
    <div className="app-container">
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Welcome to Espresso</h2>
            <p>A quick shot of connection. Tell us about yourself before you enter.</p>
            <form onSubmit={handleProfileSubmit}>
              <div className="form-group">
                <label>Nickname</label>
                <input name="nickname" required placeholder="E.g. CoolBeans" maxLength={20} />
              </div>
              <div className="form-group">
                <label>Age</label>
                <input type="number" name="age" required min={13} max={120} placeholder="E.g. 25" />
              </div>
              <div className="form-group">
                <label>Gender</label>
                <select name="gender" required>
                  <option value="">Select gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
              <div className="form-group" style={{ position: 'relative' }}>
                <label>Location</label>
                <input 
                  name="location" 
                  required 
                  placeholder="E.g. Berlin" 
                  value={locationQuery}
                  onChange={handleLocationChange}
                  autoComplete="off"
                />
                {suggestions.length > 0 && (
                  <ul className="suggestions-list">
                    {suggestions.map((s) => (
                      <li key={s.place_id} onClick={() => handleSuggestionClick(s)}>
                        {s.display_name}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <button type="submit" className="btn-primary">Enter Espresso ☕</button>
            </form>
          </div>
        </div>
      )}

      {!showModal && (
        <>
          <div className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
            <div className="sidebar-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <h1><Coffee size={24} /> Espresso</h1>
              <button className="mobile-only-btn" onClick={() => setIsSidebarOpen(false)} style={{background: 'none', border: 'none', color: 'white', cursor: 'pointer'}}>
                <X size={24} />
              </button>
            </div>
            <div className="room-list">
              {ROOMS.map((room) => (
                <div 
                  key={room.id}
                  className={`room-item ${activeRoom === room.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveRoom(room.id);
                    setIsSidebarOpen(false);
                  }}
                >
                  <span>{room.icon}</span>
                  <span>{room.name}</span>
                </div>
              ))}
            </div>
          </div>

          {isSidebarOpen && (
            <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>
          )}

          <div className="chat-area">
            <div className="chat-header">
              <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem'}}>
                <button className="mobile-only-btn" onClick={() => setIsSidebarOpen(true)} style={{background: 'none', border: 'none', color: 'var(--text-main)', cursor: 'pointer'}}>
                  <Menu size={24} />
                </button>
                <h2>{ROOMS.find(r => r.id === activeRoom)?.icon} {ROOMS.find(r => r.id === activeRoom)?.name}</h2>
              </div>
              <div className="user-profile">
                <div style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                  <span style={{color: isConnected ? '#10b981' : '#ef4444', fontSize: '20px'}}>•</span>
                  {isConnected ? 'Connected' : 'Connecting...'}
                </div>
                <span>|</span>
                <span>{userProfile?.nickname}</span>
                <span>|</span>
                <span style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                  <MapPin size={14} /> {userProfile?.location}
                </span>
              </div>
            </div>

            <div className="messages-container">
              {messages.length === 0 ? (
                <div style={{textAlign: 'center', color: 'var(--text-muted)', marginTop: '2rem'}}>
                  No messages yet. Be the first to say hi!
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender === userProfile?.nickname;
                  return (
                    <div key={msg.id} className={`message-wrapper ${isMine ? 'mine' : 'other'}`}>
                      <div className="message-meta">
                        <span>{msg.sender}</span>
                        <span>•</span>
                        <span>{msg.age}, {msg.gender?.charAt(0)}</span>
                        <span>•</span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                      <div className="message-bubble">
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="chat-input-area">
              <form className="chat-input-form" onSubmit={handleSendMessage}>
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={`Message ${ROOMS.find(r => r.id === activeRoom)?.name}...`}
                  maxLength={500}
                />
                <button type="submit" disabled={!inputText.trim() || !isConnected}>
                  <Send size={18} />
                </button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
