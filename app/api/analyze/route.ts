import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { text, action, sourceUrl } = await request.json()

    if (!text) {
      return NextResponse.json(
        { error: 'Текст для анализа не предоставлен' },
        { status: 400 }
      )
    }

    if (!action || !['summary', 'theses', 'telegram'].includes(action)) {
      return NextResponse.json(
        { error: 'Неверный тип действия. Допустимые значения: summary, theses, telegram' },
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

    // Определяем промпт в зависимости от типа действия
    let systemPrompt = ''
    let userPrompt = ''
    let temperature = 0.3

    switch (action) {
      case 'summary':
        systemPrompt = 'Ты опытный аналитик и рецензент научных статей. Твоя задача - кратко и точно описать содержание статьи.'
        userPrompt = `Прочитай следующую статью и напиши краткое описание на русском языке (2-3 предложения). О чем эта статья? Что в ней рассматривается?\n\n${text}`
        temperature = 0.3
        break

      case 'theses':
        systemPrompt = 'Ты эксперт по анализу научных текстов. Твоя задача - извлечь основные тезисы и ключевые моменты из статьи.'
        userPrompt = `Прочитай следующую статью и извлеки основные тезисы. Представь их в виде нумерованного списка на русском языке. Каждый тезис должен быть кратким и информативным.\n\n${text}`
        temperature = 0.4
        break

      case 'telegram':
        systemPrompt = 'Ты профессиональный копирайтер, специализирующийся на создании контента для социальных сетей. Твоя задача - создавать интересные и информативные посты. ВСЕГДА добавляй ссылку на источник в конце поста в указанном формате.'
        const sourceLink = sourceUrl ? `\n\nВАЖНО: В самом конце поста, после всех хештегов, обязательно добавь ссылку на источник точно в таком формате (используй HTML тег для красного цвета):\n\n📎 Источник: <span style="color: red;">${sourceUrl}</span>\n\nИли используй markdown форматирование: 📎 Источник: **${sourceUrl}**\n\nНе используй другие форматы ссылок на источник.` : ''
        userPrompt = `Создай пост для Telegram на русском языке на основе следующей статьи. Пост должен быть:\n- Интересным и привлекающим внимание\n- Информативным, но не слишком длинным\n- Подходящим для социальной сети\n- С эмодзи для визуального оформления\n- С релевантными хештегами в конце${sourceLink}\n\nСтатья:\n${text}`
        temperature = 0.7
        break
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
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userPrompt,
          },
        ],
        temperature,
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
      
      // Более информативное сообщение об ошибке
      let errorMessage = `Ошибка API OpenRouter: ${response.status}`
      if (errorData.error?.message) {
        errorMessage += ` - ${errorData.error.message}`
      } else if (errorData.message) {
        errorMessage += ` - ${errorData.message}`
      }
      
      // Специальная обработка для различных ошибок
      if (response.status === 401) {
        errorMessage = `Неверный или недействительный API ключ. Проверьте ключ на https://openrouter.ai/settings/keys и убедитесь, что он активен.`
      } else if (response.status === 403 && errorMessage.includes('limit exceeded')) {
        errorMessage = `Превышен лимит использования API ключа. Проверьте баланс и лимиты на https://openrouter.ai/settings/keys`
      }
      
      return NextResponse.json(
        { error: errorMessage, details: errorData },
        { status: response.status }
      )
    }

    const data = await response.json()

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      return NextResponse.json(
        { error: 'Неожиданный формат ответа от API' },
        { status: 500 }
      )
    }

    const result = data.choices[0].message.content

    return NextResponse.json({
      result,
    })
  } catch (error) {
    console.error('Ошибка при анализе:', error)
    return NextResponse.json(
      { error: 'Ошибка при анализе статьи', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

