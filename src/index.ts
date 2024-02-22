import type { KomgaBooksResponse } from './types/book'
import type { KomgaBookImage } from './types/book-image'
import type { KomgaSeriesResponse } from './types/series'
import type { KomgaSeriesListResponse } from './types/series-list'

function getMangaListFilterOptions (): IRuliaMangaListFilterOptions {
  return [
    {
      label: 'Sort',
      name: 'sort',
      options: [
        { label: 'Name', value: 'metadata.titleSort,asc' },
        { label: 'Name (Desc)', value: 'metadata.titleSort,desc' },
        { label: 'Date Added', value: 'createdDate,asc' },
        { label: 'Date Added (Desc)', value: 'createdDate,desc' },
        { label: 'Date Updated', value: 'lastModifiedDate,asc' },
        { label: 'Date Updated (Desc)', value: 'lastModifiedDate,desc' },
        { label: 'Release Date', value: 'booksMetadata.releaseDate,asc' },
        { label: 'Release Date (Desc)', value: 'booksMetadata.releaseDate,desc' },
        { label: 'Folder Name', value: 'name,asc' },
        { label: 'Folder Name (Desc)', value: 'name,desc' },
        { label: 'Books Count', value: 'booksCount,asc' },
        { label: 'Books Count (Desc)', value: 'booksCount,desc' }
      ]
    }
  ]
}

function safeParseRawFilterOptions (rawFilterOptions?: string): Record<string, string> {
  if (rawFilterOptions) {
    try {
      return JSON.parse(rawFilterOptions)
    } catch (error) {
      // ...
    }
  }
  return {}
}

async function setMangaListFilterOptions () {
  try {
    window.Rulia.endWithResult(getMangaListFilterOptions())
  } catch (error) {
    window.Rulia.endWithResult([])
  }
}

function getHttpHeaders (): Record<string, string> {
  const result: Record<string, string> = {}
  const userConfig = window.Rulia.getUserConfig()
  const username = userConfig.username
  const password = userConfig.password
  if (username && password) {
    result.Authorization = `Basic ${btoa(`${username}:${password}`)}`
  }
  return result
}

async function getMangaList (page: string, pageSize: string, keyword?: string, rawFilterOptions?: string) {
  const userConfig = window.Rulia.getUserConfig()
  const baseUrl = userConfig.baseUrl
  if (!baseUrl) {
    return window.Rulia.endWithException('Please provide baseUrl in plugin config')
  }

  const filterOptions = safeParseRawFilterOptions(rawFilterOptions)
  try {
    const query = new URLSearchParams()
    query.append('page', (parseInt(page) - 1).toString())
    query.append('size', pageSize)

    if (keyword) {
      query.append('search', keyword)
    }

    if (filterOptions.sort) {
      query.append('sort', filterOptions.sort)
    } else {
      query.append('sort', getMangaListFilterOptions()[0].options[0].value)
    }

    const rawResponse = await window.Rulia.httpRequest({
      url: `${baseUrl}/api/v1/series`,
      method: 'GET',
      payload: query.toString(),
      headers: getHttpHeaders()
    })

    const response = JSON.parse(rawResponse) as KomgaSeriesListResponse

    const result: IGetMangaListResult = {
      list: response.content.map(item => ({
        title: item.name,
        url: JSON.stringify({
          seriesId: item.id,
          libraryId: item.libraryId
        }),
        coverUrl: `${baseUrl}/api/v1/series/${item.id}/thumbnail`
      }))
    }

    window.Rulia.endWithResult(result)
  } catch (error) {
    window.Rulia.endWithException((error as Error).message)
  }
}

async function getMangaData (metadata: string) {
  const userConfig = window.Rulia.getUserConfig()
  const baseUrl = userConfig.baseUrl
  if (!baseUrl) {
    return window.Rulia.endWithException('Please provide baseUrl in plugin config')
  }

  const { seriesId } = JSON.parse(metadata) as {
    seriesId: string
    libraryId: string
  }

  const result: IGetMangaDataResult = {
    title: '',
    description: '',
    coverUrl: `${baseUrl}/api/v1/series/${seriesId}/thumbnail`,
    chapterList: []
  }

  // Get chapter list.
  try {
    const query = new URLSearchParams()
    query.append('sort', 'metadata.numberSort,asc')
    query.append('unpaged', 'true')

    const rawResponse = await window.Rulia.httpRequest({
      url: `${baseUrl}/api/v1/series/${seriesId}/books`,
      method: 'GET',
      payload: query.toString(),
      headers: getHttpHeaders()
    })

    const response = JSON.parse(rawResponse) as KomgaBooksResponse
    result.chapterList = response.content.map(item => ({
      title: item.name,
      url: item.id // BookId.
    }))
  } catch (error) {
    return window.Rulia.endWithException((error as Error).message)
  }

  // Get manga info.
  try {
    const rawResponse = await window.Rulia.httpRequest({
      url: `${baseUrl}/api/v1/series/${seriesId}`,
      method: 'GET',
      headers: getHttpHeaders()
    })
    const response = JSON.parse(rawResponse) as KomgaSeriesResponse
    result.title = response.name
    result.description = response.metadata.summary
  } catch (error) {
    return window.Rulia.endWithException((error as Error).message)
  }

  window.Rulia.endWithResult(result)
}

async function getChapterImageList (bookId: string) {
  const userConfig = window.Rulia.getUserConfig()
  const baseUrl = userConfig.baseUrl
  if (!baseUrl) {
    return window.Rulia.endWithException('Please provide baseUrl in plugin config')
  }

  try {
    const rawResponse = await window.Rulia.httpRequest({
      url: `${baseUrl}/api/v1/books/${bookId}/pages`,
      method: 'GET',
      headers: getHttpHeaders()
    })
    const response = await JSON.parse(rawResponse) as KomgaBookImage[]

    const result: IRuliaChapterImage[] = response.map(item => ({
      url: `${baseUrl}/api/v1/books/${bookId}/pages/${item.number}`,
      width: item.width,
      height: item.height
    }))
    window.Rulia.endWithResult(result)
  } catch (error) {
    window.Rulia.endWithException((error as Error).message)
  }
}

function getImageUrl (url: string) {
  window.Rulia.endWithResult(url)
}
