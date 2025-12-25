'use client'

import { useState } from 'react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

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
  const [translatedText, setTranslatedText] = useState<string>('')
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false) // Защита от двойного вызова

  const handleParseAndTranslate = async () => {
    if (!url.trim()) {
      return
    }

    // Защита от двойного вызова
    if (isProcessing) {
      console.log('Translation already in progress, skipping duplicate call')
      return
    }

    setIsProcessing(true)
    setLoading(true)
    setActiveButton('parse')
    setResult('')
    setParsedData(null)
    setStatusMessage('Загружаю статью...')
    setError(null)

    try {
      // Шаг 1: Парсинг статьи
      setStatusMessage('Парсинг статьи...')
      const parseController = new AbortController()
      const parseTimeout = setTimeout(() => {
        parseController.abort()
      }, 30000) // 30 секунд таймаут

      let parseResponse
      try {
        parseResponse = await fetch('/api/parse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url }),
          signal: parseController.signal,
        })
        clearTimeout(parseTimeout)
      } catch (fetchError: any) {
        clearTimeout(parseTimeout)
        if (fetchError.name === 'AbortError') {
          setError('Превышено время ожидания загрузки статьи (30 секунд). Попробуйте еще раз.')
          setStatusMessage('')
          setLoading(false)
          setActiveButton(null)
          return
        }
        throw fetchError
      }

      if (!parseResponse.ok) {
        const errorData = await parseResponse.json()
        const errorMessage = errorData.error || 'Не удалось загрузить статью по этой ссылке.'
        setError(errorMessage)
        setStatusMessage('')
        setLoading(false)
        setActiveButton(null)
        return
      }

      const parsedData: ParseResult = await parseResponse.json()
      
      // Сохраняем распарсенные данные
      setParsedData(parsedData)

      // Шаг 2: Автоматический перевод
      setActiveButton('translate')
      setStatusMessage('Перевожу на русский...')
      const textToTranslate = `Заголовок: ${parsedData.title}\n\nДата: ${parsedData.date}\n\nКонтент:\n${parsedData.content}`

      const translateController = new AbortController()
      const translateTimeout = setTimeout(() => {
        translateController.abort()
      }, 30000) // 30 секунд таймаут

      let translateResponse
      try {
        console.log('Starting translation request, text length:', textToTranslate.length)
        translateResponse = await fetch('/api/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text: textToTranslate }),
          signal: translateController.signal,
        })
        clearTimeout(translateTimeout)
        console.log('Translation response received, status:', translateResponse.status)
      } catch (fetchError: any) {
        clearTimeout(translateTimeout)
        if (fetchError.name === 'AbortError') {
          setError('Превышено время ожидания перевода (30 секунд). Попробуйте еще раз.')
          setStatusMessage('')
          setLoading(false)
          setActiveButton(null)
          return
        }
        throw fetchError
      }

      if (!translateResponse.ok) {
        const errorData = await translateResponse.json()
        const errorMessage = errorData.error || 'Ошибка при переводе статьи.'
        setError(errorMessage)
        setStatusMessage('')
        setLoading(false)
        setActiveButton(null)
        return
      }

      console.log('Parsing translation response...')
      const translateData = await translateResponse.json()
      console.log('Translation data received:', translateData ? 'OK' : 'NULL', translateData.translation ? `Length: ${translateData.translation.length}` : 'No translation field')
      
      if (!translateData || !translateData.translation) {
        console.error('Invalid translation response:', translateData)
        setError('Получен некорректный ответ от сервера перевода.')
        setStatusMessage('')
        setLoading(false)
        setActiveButton(null)
        return
      }
      
      setTranslatedText(translateData.translation)
      setResult(translateData.translation)
      setStatusMessage('')
      setError(null)
      setLoading(false)
      setActiveButton(null)
      console.log('Translation completed successfully')
    } catch (error: any) {
      let errorMessage = 'Произошла непредвиденная ошибка. Попробуйте еще раз.'
      
      if (error.name === 'AbortError') {
        errorMessage = 'Превышено время ожидания. Попробуйте еще раз или проверьте подключение к интернету.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      setError(errorMessage)
      setStatusMessage('')
      setLoading(false)
      setActiveButton(null)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (!isProcessing) {
        handleParseAndTranslate()
      }
    }
  }

  const handleUrlBlur = () => {
    if (url.trim() && !isProcessing) {
      handleParseAndTranslate()
    }
  }

  const handleAction = async (action: string) => {
    if (!parsedData || !parsedData.content) {
      alert('Сначала распарсите статью, чтобы получить контент для анализа')
      return
    }

    setLoading(true)
    setActiveButton(action)
    setResult('')
    
    // Устанавливаем статус в зависимости от действия
    const statusMessages: Record<string, string> = {
      'О чем статья?': 'Анализирую содержание статьи...',
      'Тезисы': 'Извлекаю основные тезисы...',
      'Пост для Telegram': 'Создаю пост для Telegram...',
    }
    setStatusMessage(statusMessages[action] || 'Обрабатываю запрос...')

    try {
      // Маппинг действий на типы для API
      const actionMap: Record<string, string> = {
        'О чем статья?': 'summary',
        'Тезисы': 'theses',
        'Пост для Telegram': 'telegram',
      }

      const apiAction = actionMap[action]
      if (!apiAction) {
        throw new Error('Неизвестное действие')
      }

      // Для поста Telegram используем переведенный текст, для остальных - оригинальный
      let textToAnalyze = ''
      if (apiAction === 'telegram' && translatedText) {
        // Используем переведенный текст для поста Telegram
        textToAnalyze = translatedText
      } else {
        // Для остальных действий используем оригинальный текст
        textToAnalyze = `Заголовок: ${parsedData.title}\n\nДата: ${parsedData.date}\n\nКонтент:\n${parsedData.content}`
      }

      const analyzeController = new AbortController()
      const analyzeTimeout = setTimeout(() => {
        analyzeController.abort()
      }, 30000) // 30 секунд таймаут

      let response
      try {
        console.log('Starting analysis request, action:', apiAction, 'text length:', textToAnalyze.length)
        response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            text: textToAnalyze,
            action: apiAction,
            sourceUrl: apiAction === 'telegram' ? url : undefined
          }),
          signal: analyzeController.signal,
        })
        clearTimeout(analyzeTimeout)
        console.log('Analysis response received, status:', response.status)
      } catch (fetchError: any) {
        clearTimeout(analyzeTimeout)
        if (fetchError.name === 'AbortError') {
          setError('Превышено время ожидания анализа (30 секунд). Попробуйте еще раз.')
          setStatusMessage('')
          setLoading(false)
          setActiveButton(null)
          return
        }
        throw fetchError
      }

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Ошибка при анализе статьи.'
        setError(errorMessage)
        setStatusMessage('')
        setLoading(false)
        return
      }

      console.log('Parsing analysis response...')
      const data = await response.json()
      console.log('Analysis data received:', data ? 'OK' : 'NULL', data.result ? `Length: ${data.result.length}` : 'No result field')
      
      if (!data || !data.result) {
        console.error('Invalid analysis response:', data)
        setError('Получен некорректный ответ от сервера анализа.')
        setStatusMessage('')
        setLoading(false)
        setActiveButton(null)
        return
      }
      
      setResult(data.result)
      setStatusMessage('')
      setError(null)
      setLoading(false)
      setActiveButton(null)
      console.log('Analysis completed successfully')
    } catch (error: any) {
      let errorMessage = 'Произошла непредвиденная ошибка. Попробуйте еще раз.'
      
      if (error.name === 'AbortError') {
        errorMessage = 'Превышено время ожидания. Попробуйте еще раз или проверьте подключение к интернету.'
      }
      
      setError(errorMessage)
      setStatusMessage('')
      setLoading(false)
    }
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
              onKeyDown={handleUrlKeyDown}
              onBlur={handleUrlBlur}
              placeholder="Введите URL статьи, например: https://example.com/article"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            />
            <p className="mt-2 text-xs text-gray-500">Укажите ссылку на англоязычную статью</p>
          </div>

          {/* Кнопки действий */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <button
              onClick={() => handleAction('О чем статья?')}
              disabled={loading}
              title="Получить краткое описание содержания статьи"
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
              title="Извлечь основные тезисы и ключевые моменты статьи"
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
              title="Создать пост для Telegram на основе статьи с эмодзи и хештегами"
              className={`px-6 py-3 rounded-lg font-medium transition-all ${
                activeButton === 'Пост для Telegram'
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-indigo-500 text-white hover:bg-indigo-600 hover:shadow-md'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading && activeButton === 'Пост для Telegram' ? 'Обработка...' : 'Пост для Telegram'}
            </button>
          </div>

          {/* Блок статуса процесса */}
          {statusMessage && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">{statusMessage}</p>
            </div>
          )}

          {/* Блок ошибок */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Ошибка</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Блок для отображения результата */}
          <div className="border-t border-gray-200 pt-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Результат:
              {!url.trim() ? '' : 
               activeButton === 'О чем статья?' ? ' о чём статья' :
               activeButton === 'Тезисы' ? ' тезисы' :
               activeButton === 'Пост для Telegram' ? ' пост для телеграмм' :
               !parsedData ? ' нажмите ввод' : ''}
            </h2>
            <div className="bg-gray-50 rounded-lg p-6 min-h-[200px] border border-gray-200">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
              ) : result ? (
                <div className="prose max-w-none">
                  <div 
                    className="bg-white p-4 rounded border border-gray-300 overflow-auto text-sm text-gray-800 whitespace-pre-wrap font-mono"
                    dangerouslySetInnerHTML={{
                      __html: result
                        .replace(/(https?:\/\/[^\s\)]+)/g, '<span style="color: #dc2626; font-weight: bold; text-decoration: underline;">$1</span>')
                        .replace(/\n/g, '<br>')
                    }}
                  />
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
