import { NextRequest, NextResponse } from 'next/server'
const cheerio = require('cheerio')

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json(
        { error: 'URL не предоставлен' },
        { status: 400 }
      )
    }

    // Получаем HTML страницы
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: `Ошибка при загрузке страницы: ${response.status}` },
        { status: response.status }
      )
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Извлекаем заголовок
    let title = ''
    // Пробуем различные селекторы для заголовка
    const titleSelectors = [
      'h1',
      'article h1',
      '.post-title',
      '.article-title',
      '[class*="title"]',
      'title',
    ]
    
    for (const selector of titleSelectors) {
      const found = $(selector).first().text().trim()
      if (found && found.length > 0) {
        title = found
        break
      }
    }

    // Извлекаем дату
    let date = ''
    const dateSelectors = [
      'time[datetime]',
      'time',
      '[class*="date"]',
      '[class*="published"]',
      '[class*="time"]',
      'meta[property="article:published_time"]',
      'meta[name="publish-date"]',
    ]

    for (const selector of dateSelectors) {
      if (selector.startsWith('meta')) {
        const found = $(selector).attr('content')
        if (found) {
          date = found
          break
        }
      } else {
        const found = $(selector).first()
        const dateText = found.attr('datetime') || found.text().trim()
        if (dateText && dateText.length > 0) {
          date = dateText
          break
        }
      }
    }

    // Извлекаем основной контент
    let content = ''
    const contentSelectors = [
      'article',
      '.post',
      '.content',
      '.article-content',
      '[class*="article"]',
      '[class*="post-content"]',
      '[class*="entry-content"]',
      'main',
    ]

    for (const selector of contentSelectors) {
      const found = $(selector).first()
      if (found.length > 0) {
        // Удаляем скрипты, стили и другие ненужные элементы
        found.find('script, style, nav, header, footer, aside, .ad, .advertisement').remove()
        const text = found.text().trim()
        if (text && text.length > 100) {
          content = text
          break
        }
      }
    }

    // Если не нашли контент, пробуем body
    if (!content) {
      const body = $('body')
      body.find('script, style, nav, header, footer, aside, .ad, .advertisement').remove()
      content = body.text().trim()
    }

    // Очищаем контент от лишних пробелов и переносов строк
    content = content.replace(/\s+/g, ' ').trim()

    return NextResponse.json({
      date: date || 'Не найдено',
      title: title || 'Не найдено',
      content: content || 'Не найдено',
    })
  } catch (error) {
    console.error('Ошибка при парсинге:', error)
    return NextResponse.json(
      { error: 'Ошибка при парсинге статьи', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

