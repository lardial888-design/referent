import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json(
        { error: 'Текст для перевода не предоставлен' },
        { status: 400 }
      )
    }

    const apiKey = process.env.OPENROUTER_API_KEY?.trim()

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API ключ OpenRouter не настроен. Добавьте OPENROUTER_API_KEY в .env.local' },
        { status: 500 }
      )
    }

    // Запрос к OpenRouter API
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': appUrl,
        'X-Title': 'Referent',
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a professional translator. Translate the following text from English to Russian, preserving structure and formatting.',
          },
          {
            role: 'user',
            content: `Translate to Russian:\n\n${text}`,
          },
        ],
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      let errorData
      try {
        errorData = await response.json()
      } catch {
        errorData = { message: await response.text() }
      }
      console.error('OpenRouter API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      })
      
      // Дружественные сообщения об ошибках на русском
      let errorMessage = 'Ошибка при обращении к API перевода. Попробуйте еще раз.'
      
      if (response.status === 401) {
        errorMessage = 'Неверный или недействительный API ключ. Проверьте ключ на https://openrouter.ai/settings/keys и убедитесь, что он активен.'
      } else if (response.status === 403) {
        if (errorData.error?.message?.includes('limit') || errorData.message?.includes('limit')) {
          errorMessage = 'Превышен лимит использования API ключа. Проверьте баланс и лимиты на https://openrouter.ai/settings/keys'
        } else {
          errorMessage = 'Доступ запрещен. Проверьте настройки API ключа.'
        }
      } else if (response.status === 429) {
        errorMessage = 'Слишком много запросов. Подождите немного и попробуйте снова.'
      } else if (response.status >= 500) {
        errorMessage = 'Ошибка сервера OpenRouter. Попробуйте позже.'
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      )
    }

    const data = await response.json()

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return NextResponse.json(
        { error: 'Неожиданный формат ответа от API' },
        { status: 500 }
      )
    }

    const translatedText = data.choices[0].message.content

    return NextResponse.json({
      translation: translatedText,
    })
  } catch (error) {
    console.error('Ошибка при переводе:', error)
    return NextResponse.json(
      { error: 'Ошибка при переводе статьи', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}


