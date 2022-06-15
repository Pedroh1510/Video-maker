import Watson from '../../infra/service/watson.js'
import Wikipedia from '../../infra/service/wikipedia.js'
import InputRepository from '../../repository/input.js'
import TextRepository from '../../repository/text.js'
import { normalizeText, removeBlankLines } from './utils/functions.js'

export default class TextWikipedia {
  #inputRepository = new InputRepository()
  #textRepository = new TextRepository()
  #lenguage = 'en'
  constructor(
    inputRepository = new InputRepository(),
    textRepository = new TextRepository()
  ) {
    this.#inputRepository = inputRepository
    this.#textRepository = textRepository
  }

  async #fetchContent({ lenguage, searchTerm }) {
    console.log('Iniciando busca de conteúdo')
    try {
      const wikipedia = new Wikipedia(lenguage)
      const listSearchTerms = await wikipedia.searchTerm({ searchTerm })
      if (!Array.isArray(listSearchTerms) || listSearchTerms.length > 0)
        throw new Error('Search term is not valid')
      const { url, content, summary } = await wikipedia.getContent({
        searchTerm: listSearchTerms[0],
      })
      return { summary, url, content }
    } catch (error) {
      throw new Error(`Falha ao consultar da Wikipedia ${error.message}`)
    }
  }

  #sanitizeContent(content) {
    console.log('Iniciando sanitização do texto')
    const textWithoutBlankLines = removeBlankLines(content)
    return normalizeText(textWithoutBlankLines)
  }

  async #splitContentInSentences(content) {
    console.log('Iniciando quebra do texto em sentenças')
    const { sentences } = await new Watson().nluAnalize(content, this.#lenguage)
    return sentences.map((sentence) => {
      if (sentence.text === undefined) throw new Error('Sentence is undefined')
      return sentence.text
    })
  }

  async #getKeywords(content) {
    const { keywords } = await new Watson().nluAnalize(content, this.#lenguage)
    if (keywords.length === 0 || !keywords) throw new Error('Keywords is empty')
    return keywords
      .filter((keyword) => keyword?.relevance > 0.5 && keyword?.text)
      .slice(0, 3)
      .map((keyword) => keyword?.text)
  }

  async #getKeywordsForAllSentences(sentences = ['']) {
    console.log('Iniciando processamento de keywords')
    const fatormatedSentences = []
    for await (const sentence of sentences) {
      const keywords = await this.#getKeywords(sentence)
      fatormatedSentences.push({ sentence, keywords })
    }
    return fatormatedSentences
  }

  #getLimitedSentences(sentences = [''], limit = 3) {
    console.log('Limitando sentenças')
    return sentences.slice(0, limit)
  }

  async run({ inputId }) {
    console.log('Iniciando processamento de texto')
    const { lenguage, searchTerm, maxSentences } =
      await this.#inputRepository.getById(inputId)
    this.#lenguage = lenguage
    const text = { inputId }
    const { url, content } = await this.#fetchContent({
      lenguage,
      searchTerm,
    })
    text.origin = url
    const sanitizeContent = this.#sanitizeContent(content)
    text.content = sanitizeContent
    const { id } = await this.#textRepository.save(text)
    const sentencesObj = { textId: id }
    const sentences = await this.#splitContentInSentences(
      sanitizeContent,
      lenguage
    )
    const sentencesTmp = this.#getLimitedSentences(sentences, maxSentences)
    sentencesObj.sentences = await this.#getKeywordsForAllSentences(
      sentencesTmp
    )
    await this.#textRepository.saveSentences(sentencesObj)
    console.log(`Processamento de texto finalizado, id: ${id}`)
    return id
  }
}
