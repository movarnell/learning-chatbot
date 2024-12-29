import { useState } from 'react';

interface Question {
  question: string;
  options: string[];
  correctAnswer: string;
}

interface MultipleChoiceProps {
  questions: Question[];
  onClose: () => void;
}

export default function MultipleChoice({ questions, onClose }: MultipleChoiceProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const handleAnswer = () => {
    setShowFeedback(true);
  };

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(curr => curr + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full">
        <h2 className="text-xl mb-4">{questions[currentQuestion].question}</h2>
        <div className="space-y-2">
          {questions[currentQuestion].options.map((option, index) => (
            <button
              key={index}
              className={`w-full p-2 text-left rounded ${
                selectedAnswer === option
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
              onClick={() => setSelectedAnswer(option)}
            >
              {option}
            </button>
          ))}
        </div>
        {!showFeedback ? (
          <button
            className="mt-4 bg-green-500 text-white px-4 py-2 rounded disabled:bg-gray-300"
            onClick={handleAnswer}
            disabled={!selectedAnswer}
          >
            Submit Answer
          </button>
        ) : (
          <div className="mt-4">
            <p className={`mb-2 ${
              selectedAnswer === questions[currentQuestion].correctAnswer
                ? 'text-green-600'
                : 'text-red-600'
            }`}>
              {selectedAnswer === questions[currentQuestion].correctAnswer
                ? 'Correct!'
                : `Incorrect. The correct answer is: ${questions[currentQuestion].correctAnswer}`}
            </p>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded"
              onClick={nextQuestion}
            >
              {currentQuestion < questions.length - 1 ? 'Next Question' : 'Finish'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}