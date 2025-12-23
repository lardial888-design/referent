'use client'

import { useState } from 'react'

interface ParseResult {
  date: string
  title: string
  content: string
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeButton, setActiveButton] = useState<string | null>(null)
  const [parsedData, setParsedData] = useState<ParseResult | null>(null)

  const handleParse = async () => {
    if (!url.trim()) {
      alert('Пожалуйста, введите URL статьи')
      return
    }

    setLoading(true)
    setActiveButton('parse')
    setResult('')

    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ошибка при парсинге статьи')
      }

      const data: ParseResult = await response.json()
      
      // Сохраняем распарсенные данные для дальнейшего использования
      setParsedData(data)
      
      // Форматируем JSON для красивого отображения
      const formattedJson = JSON.stringify(data, null, 2)
      setResult(formattedJson)
    } catch (error) {
      setResult(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleTranslate = async () => {
    if (!parsedData || !parsedData.content) {
      alert('Сначала распарсите статью, чтобы получить контент для перевода')
      return
    }

    setLoading(true)
    setActiveButton('translate')
    setResult('')

    try {
      // Переводим весь контент статьи
      const textToTranslate = `Заголовок: ${parsedData.title}\n\nДата: ${parsedData.date}\n\nКонтент:\n${parsedData.content}`

      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: textToTranslate }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ошибка при переводе статьи')
      }

      const data = await response.json()
      setResult(data.translation)
    } catch (error) {
      setResult(`Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (action: string) => {
    if (!url.trim()) {
      alert('Пожалуйста, введите URL статьи')
      return
    }

    setLoading(true)
    setActiveButton(action)
    setResult('')

    // Имитация запроса к AI (здесь будет реальная логика)
    setTimeout(() => {
      setResult(`Результат для действия "${action}" будет здесь...`)
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Анализ статей с помощью AI
          </h1>

          {/* Поле ввода URL */}
          <div className="mb-6">
            <label htmlFor="article-url" className="block text-sm font-medium text-gray-700 mb-2">
              URL англоязычной статьи
            </label>
            <input
              id="article-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/article"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            />
          </div>

          {/* Кнопки парсинга и перевода */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <button
              onClick={handleParse}
              disabled={loading}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeButton === 'parse'
                  ? 'bg-green-600 text-white shadow-lg'
                  : 'bg-green-500 text-white hover:bg-green-600 hover:shadow-md'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading && activeButton === 'parse' ? 'Парсинг...' : 'Парсить статью'}
            </button>
            <button
              onClick={handleTranslate}
              disabled={loading || !parsedData}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeButton === 'translate'
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-purple-500 text-white hover:bg-purple-600 hover:shadow-md'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading && activeButton === 'translate' ? 'Перевод...' : 'Перевести'}
            </button>
          </div>

          {/* Кнопки действий */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <button
              onClick={() => handleAction('О чем статья?')}
              disabled={loading}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeButton === 'О чем статья?'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-indigo-500 text-white hover:bg-indigo-600 hover:shadow-md'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading && activeButton === 'О чем статья?' ? 'Обработка...' : 'О чем статья?'}
            </button>

            <button
              onClick={() => handleAction('Тезисы')}
              disabled={loading}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeButton === 'Тезисы'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-indigo-500 text-white hover:bg-indigo-600 hover:shadow-md'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading && activeButton === 'Тезисы' ? 'Обработка...' : 'Тезисы'}
            </button>

            <button
              onClick={() => handleAction('Пост для Telegram')}
              disabled={loading}
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeButton === 'Пост для Telegram'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-indigo-500 text-white hover:bg-indigo-600 hover:shadow-md'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading && activeButton === 'Пост для Telegram' ? 'Обработка...' : 'Пост для Telegram'}
            </button>
          </div>

          {/* Блок для отображения результата */}
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Результат:</h2>
            <div className="bg-gray-50 rounded-lg p-6 min-h-[200px] border border-gray-200">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
              ) : result ? (
                <div className="prose max-w-none">
                  <pre className="bg-white p-4 rounded border border-gray-300 overflow-auto text-sm text-gray-800 whitespace-pre-wrap font-mono">
                    {result}
                  </pre>
                </div>
              ) : (
                <p className="text-gray-400 text-center">Результат появится здесь после выбора действия...</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
