
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const [topic, setTopic] = useState('');
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center p-4">
      <input
        className="border p-2 mb-2"
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="Enter a topic"
      />
      <button
        className="bg-blue-500 text-white px-4 py-2"
        onClick={() => navigate('/chat', { state: { topic } })}
      >
        Submit
      </button>
    </div>
  );
}