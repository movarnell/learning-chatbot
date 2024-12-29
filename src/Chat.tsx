import { useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import MultipleChoice from './MultipleChoice';
import { JSX } from 'react/jsx-runtime';

interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
}

// Add new interface for messages to track read status
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  id?: string;
  isRead?: boolean;
  hasQuestions?: boolean;
}

function parseQuestions(content: string): Question[] | null {
  const questionRegex = /\[MULTIPLE_CHOICE\]([\s\S]*?)\[\/MULTIPLE_CHOICE\]/g;
  const matches = [...content.matchAll(questionRegex)];

  if (matches.length === 0) return null;

  return matches.map(match => {
    try {
      return JSON.parse(match[1].trim());
    } catch (e) {
      console.error('Failed to parse question:', e);
      return null;
    }
  }).filter(q => q !== null);
}

function formatChatText(text: string) {
  // Remove multiple choice blocks before processing
  text = text.replace(/\[MULTIPLE_CHOICE\][\s\S]*?\[\/MULTIPLE_CHOICE\]/g, '');

  const lines = text.split('\n');
  const formatted: JSX.Element[] = [];
  let inCodeBlock = false;
  let codeContent = '';
  let language = '';

  lines.forEach((line, index) => {
    if (line.startsWith('```')) {
      if (!inCodeBlock) {
        // Start of code block
        inCodeBlock = true;
        language = line.slice(3).trim(); // Get language if specified
      } else {
        // End of code block
        inCodeBlock = false;
        formatted.push(
          <pre key={`code-${index}`} className="bg-gray-800 text-white p-4 rounded my-2 overflow-x-auto">
            <code className={`language-${language || 'plaintext'}`}>
              {codeContent.trim()}
            </code>
          </pre>
        );
        codeContent = '';
        language = '';
      }
      return;
    }

    if (inCodeBlock) {
      codeContent += line + '\n';
    } else {
      formatted.push(
        <p key={index} className="mb-2 whitespace-pre-wrap">
          {line}
        </p>
      );
    }
  });

  return formatted;
}

export default function Chat() {
  const location = useLocation();
  const navigate = useNavigate();
  const topic = location.state?.topic || '';
  const [showQuestions, setShowQuestions] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [readyForQuestions, setReadyForQuestions] = useState(false);
  const [hasQuestions, setHasQuestions] = useState(false);
  const [readMessages, setReadMessages] = useState<Set<string>>(new Set());
  const MAX_MESSAGES = 20; // Maximum number of messages to keep in history

  const shouldShowQuestions = hasQuestions && readyForQuestions;

  const systemMessage: ChatMessage = {
    role: 'system',
    content: `You are a helpful tutor. After providing information to educate the user, ask comprehension questions to check the users understanding. Your goal is to make sure the user has learned the topic and to help them achieve this.
    When you want to ask multiple choice questions, format them like this:
    [MULTIPLE_CHOICE]
    {
      "question": "Your question here?",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correctAnswer": "Option 1"
    }
    [/MULTIPLE_CHOICE]
    You can include multiple question blocks in one response.`
  };

  useEffect(() => {
    startConversation();
  }, [topic]);

  async function processResponse(response: Response) {
    const data = await response.json();
    const assistantMessage = data.choices?.[0]?.message;

    if (!assistantMessage?.content) {
      throw new Error('Invalid API response structure.');
    }

    // Clean and format the message content
    const content = assistantMessage.content.trim();
    const parsedQuestions = parseQuestions(content);

    // Update hasQuestions if we find questions in the response
    if (parsedQuestions) {
      setHasQuestions(true);
    }

    return {
      content,
      questions: parsedQuestions,
      id: Date.now().toString() // Add unique ID
    };
  }

  async function startConversation() {
    setIsLoading(true);
    try {
      const requestBody = {
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a helpful tutor. After providing information to educate the user, ask comprehension questions to check the users understanding. Your goal is to make sure the user has learned the topic and to help them achieve this.
            When you want to ask multiple choice questions, format them like this:
            [MULTIPLE_CHOICE]
            {
              "question": "Your question here?",
              "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
              "correctAnswer": "Option 1"
            }
            [/MULTIPLE_CHOICE]
            You can include multiple question blocks in one response.`
          },
          {
            role: 'user',
            content: `I want to learn about ${topic}. Please explain it in simple terms.`
          }
        ],
        temperature: 0.7,
        max_tokens: 1500,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      };

      console.log('Request Body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const { content, questions, id } = await processResponse(response);
      setMessages([{
        role: 'assistant',
        content,
        id,
        hasQuestions: !!questions
      }]);

      if (questions) {
        setQuestions(questions);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUserMessage() {
    if (!userInput.trim()) return;

    const newMsg: ChatMessage = { role: 'user', content: userInput.trim() };
    setMessages(prev => [...prev, newMsg]);
    setUserInput('');
    setIsLoading(true);

    try {
      const allMessages = [
        {
          role: 'system',
          content: systemMessage.content
        },
        ...messages.slice(-MAX_MESSAGES),
        newMsg
      ];

      const requestBody = {
        model: 'gpt-4',
        messages: allMessages,
        temperature: 0.7,
        max_tokens: 1500,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0
      };

      console.log('Request Body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const { content, questions } = await processResponse(response);

      setMessages(prev => {
        const updated = [...prev, { role: 'assistant', content }];
        return updated.length > MAX_MESSAGES ? updated.slice(updated.length - MAX_MESSAGES) : updated;
      });

      if (questions) {
        setQuestions(questions);
        setShowQuestions(true);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  }

  // Add function to handle marking messages as read
  const handleMarkAsRead = (messageId: string) => {
    setReadMessages(prev => new Set(prev).add(messageId));
  };

  return (
    <div className="flex flex-col h-screen p-4">
      <h1 className="text-2xl mb-4">Chat about: {topic}</h1>
      <div className="flex-1 overflow-y-auto flex flex-col space-y-2 mb-4 border p-2 rounded">
        {messages.map((msg, i) => (
          <div key={i} className="flex flex-col">
            <div
              className={`p-2 rounded ${
                msg.role === 'assistant'
                  ? 'bg-gray-200 self-start max-w-3xl'
                  : 'bg-blue-500 text-white self-end max-w-md'
              }`}
            >
              {formatChatText(msg.content)}
            </div>
            {msg.role === 'assistant' && msg.id && msg.hasQuestions && !readMessages.has(msg.id) && (
              <button
                onClick={() => handleMarkAsRead(msg.id!)}
                className="bg-blue-400 text-white px-4 py-2 rounded mt-2 self-start"
              >
                I've Read This and I'm Ready for Questions
              </button>
            )}
            {msg.role === 'assistant' && msg.id && msg.hasQuestions && readMessages.has(msg.id) && !showQuestions && (
              <button
                onClick={() => setShowQuestions(true)}
                className="bg-green-500 text-white px-4 py-2 rounded mt-2 self-start"
              >
                Take Quiz
              </button>
            )}
          </div>
        ))}
        {isLoading && (
          <div className="self-start bg-gray-100 p-2 rounded">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        )}
      </div>
      <div className="flex space-x-2 mb-4">
        <input
          className="border p-2 flex-1"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
        />
        <button
          className="bg-blue-500 text-white px-4 py-2"
          onClick={handleUserMessage}
        >
          Send
        </button>
      </div>
      <div className="flex flex-col space-y-2">
        <button
          className="bg-gray-500 text-white px-4 py-2"
          onClick={() => navigate('/')}
        >
          Back Home
        </button>
      </div>
      {showQuestions && questions && (
        <MultipleChoice
          questions={questions}
          onClose={() => {
            setShowQuestions(false);
            setQuestions(null);
            setReadyForQuestions(false);
            setHasQuestions(false);
          }}
        />
      )}
    </div>
  );
}