import React, { useState, useCallback } from 'react';
import { searchWithGemini } from 'vibe-search-gemini';

// Sample content for demonstration
const SAMPLE_CONTENT = `Node.js official website: https://nodejs.org/
React documentation: https://reactjs.org/docs/
Google AI Studio: https://aistudio.google.com/
GitHub repository for Gemini: https://github.com/google-gemini/generative-ai-js
Vite build tool: https://vitejs.dev/
TypeScript handbook: https://www.typescriptlang.org/docs/
MDN Web Docs: https://developer.mozilla.org/
Stack Overflow: https://stackoverflow.com/`;

const SAMPLE_QUERY = "Find documentation and learning resources";

function App() {
  const [content, setContent] = useState('');
  const [query, setQuery] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      setError('Please enter your Gemini API key');
      return;
    }
    
    if (!content.trim()) {
      setError('Please enter some content to search within');
      return;
    }
    
    if (!query.trim()) {
      setError('Please enter a search query');
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const result = await searchWithGemini({
        content: content.trim(),
        query: query.trim(),
        apiKey: apiKey.trim(),
        model: 'gemini-2.5-flash'
      });
      
      setResults(result);
    } catch (err) {
      setError(err.message || 'An error occurred during search');
    } finally {
      setLoading(false);
    }
  };

  const loadSampleContent = useCallback(() => {
    setContent(SAMPLE_CONTENT);
    setQuery(SAMPLE_QUERY);
  }, []);

  const copyToClipboard = useCallback(async (text, index) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  }, []);

  const copyAllResults = useCallback(async () => {
    if (!results?.answers?.length) return;
    
    const allText = results.answers.join('\n');
    try {
      await navigator.clipboard.writeText(allText);
      setCopiedIndex('all');
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
      console.error('Failed to copy all results: ', err);
    }
  }, [results]);

  return (
    <div className="container">
      <div className="header">
        <h1>🔍 Vibe Search Gemini</h1>
        <p>AI-vibe search within your content using Google Gemini</p>
      </div>

      {!apiKey && (
        <div className="api-key-warning">
          ⚠️ You need a Gemini API key to use this demo. Get one from{' '}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" style={{color: 'white', textDecoration: 'underline'}}>
            Google AI Studio
          </a>
        </div>
      )}

      <form onSubmit={handleSearch} className="search-form">
        <div className="form-group">
          <label htmlFor="apiKey">Gemini API Key</label>
          <input
            type="password"
            id="apiKey"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your Gemini API key"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="content">Content to search within</label>
          <textarea
            id="content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter the content you want to search within"
            required
          />
          <div className="sample-content">
            <button type="button" onClick={loadSampleContent}>
              Load Sample Content
            </button>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="query">Search query</label>
          <input
            type="text"
            id="query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What are you looking for?"
            required
          />
        </div>

        <button type="submit" className="search-button" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && (
        <div className="error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading && (
        <div className="loading">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <div className="spinner"></div>
            <span>Searching with Gemini AI...</span>
          </div>
        </div>
      )}

      {results && (
        <div className="results">
          <h2>
            Search Results
            <span className="results-count">{results.answers.length}</span>
          </h2>
          
          {results.answers.length > 0 ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <span></span>
                <button 
                  onClick={copyAllResults}
                  className="copy-button"
                  style={{ 
                    position: 'static', 
                    opacity: 1,
                    background: copiedIndex === 'all' ? '#1a1a1a' : '#ffffff'
                  }}
                >
                  {copiedIndex === 'all' ? 'Copied!' : 'Copy All'}
                </button>
              </div>
              <ul className="answers-list">
                {results.answers.map((answer, index) => (
                  <li key={index} className="answer-item" onClick={() => copyToClipboard(answer, index)}>
                    <div className="answer-content">{answer}</div>
                    <button 
                      className={`copy-button ${copiedIndex === index ? 'copied' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(answer, index);
                      }}
                    >
                      {copiedIndex === index ? 'Copied!' : 'Copy'}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p style={{ color: '#666', textAlign: 'center', padding: '40px 0' }}>
              No answers found in the provided content.
            </p>
          )}

          <div className="raw-response">
            <h3>Raw AI Response:</h3>
            <pre>{results.raw}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;